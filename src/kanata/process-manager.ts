import { spawn, ChildProcess, execSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { getKanataBinaryPath } from "./binary-path";
import { getConfigManager } from "./config-manager";
import * as sudoPrompt from "@vscode/sudo-prompt";
import * as fs from "node:fs";
import * as path from "node:path";
import { app } from "electron";

export type KanataStatus = "stopped" | "starting" | "running" | "error";

export interface KanataLogEntry {
  type: "stdout" | "stderr";
  message: string;
  timestamp: number;
}

export interface KanataProcessEvents {
  "status-change": (status: KanataStatus) => void;
  log: (entry: KanataLogEntry) => void;
  error: (error: string) => void;
  crash: (code: number | null, signal: string | null) => void;
}

const isMacOS = process.platform === "darwin";

/**
 * Manages the Kanata child process lifecycle.
 * On macOS, uses sudo-prompt to request elevated permissions.
 */
export class KanataProcessManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private status: KanataStatus = "stopped";
  private autoRestart = false;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private restartDelay = 1000;
  private restartTimeoutId: NodeJS.Timeout | null = null;
  private intentionalStop = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private pidFile: string;

  constructor() {
    super();
    // Store PID file in app data directory
    const appDataPath = app.getPath("userData");
    this.pidFile = path.join(appDataPath, "kanata.pid");
  }

  getStatus(): KanataStatus {
    return this.status;
  }

  isRunning(): boolean {
    return this.status === "running";
  }

  setAutoRestart(enabled: boolean): void {
    this.autoRestart = enabled;
  }

  /**
   * Check if a Kanata process is already running
   */
  private getRunningKanataPid(): number | null {
    try {
      // Check our PID file first
      if (fs.existsSync(this.pidFile)) {
        const pid = parseInt(fs.readFileSync(this.pidFile, "utf8").trim(), 10);
        if (pid && this.isProcessRunning(pid)) {
          // Verify it's actually a kanata process, not something else
          try {
            const psResult = execSync(
              `ps -p ${pid} -o command= 2>/dev/null || true`,
              {
                encoding: "utf8",
              }
            ).trim();
            if (
              psResult.includes("kanata") &&
              !psResult.includes("kanata-ui")
            ) {
              return pid;
            }
          } catch {
            // Fall through to cleanup
          }
        }
        // PID file exists but process is dead or wrong, clean up
        fs.unlinkSync(this.pidFile);
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  private isProcessRunning(pid: number): boolean {
    try {
      // Check if process exists by sending signal 0
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Starts the Kanata process.
   * On macOS, prompts for sudo password.
   */
  async start(): Promise<boolean> {
    console.log("[KanataProcessManager] start() called");

    // Check for existing process first
    const existingPid = this.getRunningKanataPid();
    if (existingPid) {
      console.log(
        "[KanataProcessManager] Kanata already running at PID:",
        existingPid
      );
      this.emitLog("stdout", `Kanata already running (PID: ${existingPid})`);
      this.setStatus("running");
      this.startProcessPolling(existingPid);
      return true;
    }

    if (this.process) {
      console.log("[KanataProcessManager] Already running");
      this.emitLog("stderr", "Kanata is already running");
      return false;
    }

    this.intentionalStop = false;
    this.setStatus("starting");

    try {
      const binaryPath = getKanataBinaryPath();
      const configPath = getConfigManager().getKbdConfigPath();

      console.log("[KanataProcessManager] Binary:", binaryPath);
      console.log("[KanataProcessManager] Config:", configPath);

      this.emitLog("stdout", `Starting Kanata...`);

      if (isMacOS) {
        return this.startWithSudo(binaryPath, configPath);
      } else {
        return this.startDirect(binaryPath, configPath);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[KanataProcessManager] Failed to start:", message);
      this.emitLog("stderr", `Failed to start Kanata: ${message}`);
      this.setStatus("error");
      this.emit("error", message);
      return false;
    }
  }

  /**
   * Start Kanata directly (Linux/Windows)
   */
  private startDirect(binaryPath: string, configPath: string): boolean {
    this.process = spawn(binaryPath, ["-n", "-c", configPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const pid = this.process.pid;
    console.log("[KanataProcessManager] Process spawned, pid:", pid);

    if (pid) {
      fs.writeFileSync(this.pidFile, String(pid));
    }

    this.setupProcessHandlers();
    this.setStatus("running");
    this.restartAttempts = 0;
    return true;
  }

  private logFile = "";
  private logTailInterval: NodeJS.Timeout | null = null;
  private lastLogPosition = 0;

  /**
   * Start Kanata with sudo on macOS
   */
  private startWithSudo(
    binaryPath: string,
    configPath: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Run kanata in background, redirect output to a log file we can tail
      this.logFile = path.join(path.dirname(this.pidFile), "kanata.log");

      // Simple background execution with output redirection
      const command = `"${binaryPath}" -n -c "${configPath}" > "${this.logFile}" 2>&1 & echo $! > "${this.pidFile}"`;

      this.emitLog("stdout", "Requesting administrator privileges...");

      sudoPrompt.exec(
        command,
        { name: "Kanata UI" },
        (error, stdout, stderr) => {
          if (error) {
            // User cancelled or error occurred
            console.error("[KanataProcessManager] Sudo error:", error);
            this.emitLog("stderr", `${error.message}`);
            this.setStatus("stopped");
            resolve(false);
            return;
          }

          if (stdout) {
            const out = typeof stdout === "string" ? stdout : stdout.toString();
            if (out.trim()) {
              console.log("[Kanata stdout]", out);
            }
          }
          if (stderr) {
            const err = typeof stderr === "string" ? stderr : stderr.toString();
            if (err.trim()) {
              console.log("[Kanata stderr]", err);
              this.emitLog("stderr", err);
            }
          }

          // Give it a moment to start and write the PID file
          setTimeout(() => {
            const pid = this.getRunningKanataPid();
            if (pid) {
              this.emitLog("stdout", `Kanata started (PID: ${pid})`);
              this.setStatus("running");
              this.restartAttempts = 0;
              this.startProcessPolling(pid);
              this.startLogTailing();
              resolve(true);
            } else {
              // Check log file for errors
              this.checkLogForErrors();
              this.setStatus("error");
              resolve(false);
            }
          }, 1500);
        }
      );
    });
  }

  private startLogTailing(): void {
    this.stopLogTailing();
    this.lastLogPosition = 0;

    this.logTailInterval = setInterval(() => {
      try {
        if (!this.logFile || !fs.existsSync(this.logFile)) return;

        const stats = fs.statSync(this.logFile);
        if (stats.size > this.lastLogPosition) {
          const fd = fs.openSync(this.logFile, "r");
          const buffer = Buffer.alloc(stats.size - this.lastLogPosition);
          fs.readSync(fd, buffer, 0, buffer.length, this.lastLogPosition);
          fs.closeSync(fd);

          const newContent = buffer.toString("utf8").trim();
          if (newContent) {
            for (const line of newContent.split("\n")) {
              if (line.trim()) {
                const isError =
                  line.includes("ERROR") ||
                  line.includes("error:") ||
                  line.includes("Permission denied") ||
                  line.includes("not permitted");
                this.emitLog(isError ? "stderr" : "stdout", line);
                
                // Detect Input Monitoring permission error
                if (line.includes("not permitted") && line.includes("IOHIDDeviceOpen")) {
                  this.emitLog("stderr", "⚠️ Input Monitoring permission required!");
                  this.emitLog("stderr", "Go to: System Settings → Privacy & Security → Input Monitoring");
                  this.emitLog("stderr", "Add the kanata binary and enable it.");
                }
              }
            }
          }
          this.lastLogPosition = stats.size;
        }
      } catch {
        // Ignore read errors
      }
    }, 1000);
  }

  private stopLogTailing(): void {
    if (this.logTailInterval) {
      clearInterval(this.logTailInterval);
      this.logTailInterval = null;
    }
  }

  private checkLogForErrors(): void {
    try {
      if (this.logFile && fs.existsSync(this.logFile)) {
        const content = fs.readFileSync(this.logFile, "utf8");
        if (content.trim()) {
          for (const line of content.split("\n").slice(-10)) {
            if (line.trim()) {
              this.emitLog("stderr", line);
            }
          }
        } else {
          this.emitLog("stderr", "Kanata process not found after start");
        }
      } else {
        this.emitLog("stderr", "Kanata process not found after start");
      }
    } catch {
      this.emitLog("stderr", "Kanata process not found after start");
    }
  }

  /**
   * Poll to check if the process is still running
   */
  private startProcessPolling(pid: number): void {
    this.stopProcessPolling();

    this.pollInterval = setInterval(() => {
      if (!this.isProcessRunning(pid)) {
        console.log("[KanataProcessManager] Process no longer running");
        this.handleProcessExit();
      }
    }, 2000);
  }

  private stopProcessPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private handleProcessExit(): void {
    this.stopProcessPolling();
    this.stopLogTailing();
    this.process = null;

    // Clean up PID file
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
    } catch {
      // Ignore
    }

    if (this.intentionalStop) {
      this.emitLog("stdout", "Kanata stopped");
      this.setStatus("stopped");
      return;
    }

    this.emitLog("stderr", "Kanata exited unexpectedly");
    this.emit("crash", null, null);

    if (this.autoRestart && this.restartAttempts < this.maxRestartAttempts) {
      this.scheduleRestart();
    } else {
      this.setStatus("error");
    }
  }

  /**
   * Stops the Kanata process.
   */
  async stop(): Promise<boolean> {
    this.intentionalStop = true;
    this.clearRestartTimeout();
    this.stopProcessPolling();
    this.stopLogTailing();

    // Handle direct process
    if (this.process) {
      const proc = this.process;
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            this.process.kill("SIGKILL");
          }
        }, 5000);

        proc.once("exit", () => {
          clearTimeout(timeout);
          this.cleanupPidFile();
          resolve(true);
        });

        this.emitLog("stdout", "Stopping Kanata...");
        proc.kill("SIGTERM");
      });
    }

    // Handle sudo process (macOS)
    const pid = this.getRunningKanataPid();
    if (pid) {
      return new Promise((resolve) => {
        this.emitLog("stdout", "Stopping Kanata...");

        // Need sudo to kill a root process
        sudoPrompt.exec(
          `kill ${pid} 2>/dev/null; sleep 1; kill -9 ${pid} 2>/dev/null; exit 0`,
          { name: "Kanata UI" },
          () => {
            this.cleanupPidFile();
            this.setStatus("stopped");
            resolve(true);
          }
        );
      });
    }

    this.setStatus("stopped");
    return true;
  }

  private cleanupPidFile(): void {
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
    } catch {
      // Ignore
    }
  }

  async restart(): Promise<boolean> {
    await this.stop();
    // Small delay to ensure process is fully stopped
    await new Promise((r) => setTimeout(r, 500));
    return this.start();
  }

  async reloadConfig(): Promise<boolean> {
    this.emitLog("stdout", "Reloading configuration...");
    return this.restart();
  }

  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        console.log("[Kanata stdout]", message);
        this.emitLog("stdout", message);
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        console.log("[Kanata stderr]", message);
        this.emitLog("stderr", message);
      }
    });

    this.process.on("error", (error) => {
      console.error("[KanataProcessManager] Process error:", error);
      this.emitLog("stderr", `Process error: ${error.message}`);
      this.setStatus("error");
      this.emit("error", error.message);
    });

    this.process.on("exit", (code, signal) => {
      console.log(
        "[KanataProcessManager] Exit - code:",
        code,
        "signal:",
        signal
      );
      this.process = null;
      this.cleanupPidFile();

      if (this.intentionalStop) {
        this.emitLog("stdout", "Kanata stopped");
        this.setStatus("stopped");
        return;
      }

      this.emitLog(
        "stderr",
        `Kanata exited (code: ${code}, signal: ${signal})`
      );
      this.emit("crash", code, signal);

      if (this.autoRestart && this.restartAttempts < this.maxRestartAttempts) {
        this.scheduleRestart();
      } else {
        this.setStatus("error");
      }
    });
  }

  private scheduleRestart(): void {
    this.restartAttempts++;
    const delay = this.restartDelay * this.restartAttempts;

    this.emitLog(
      "stdout",
      `Restart ${this.restartAttempts}/${this.maxRestartAttempts} in ${delay}ms...`
    );

    this.restartTimeoutId = setTimeout(() => {
      this.start();
    }, delay);
  }

  private clearRestartTimeout(): void {
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
  }

  private setStatus(status: KanataStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit("status-change", status);
    }
  }

  private emitLog(type: "stdout" | "stderr", message: string): void {
    this.emit("log", { type, message, timestamp: Date.now() });
  }

  async cleanup(): Promise<void> {
    this.autoRestart = false;
    this.clearRestartTimeout();
    await this.stop();
  }
}

// Singleton
let processManagerInstance: KanataProcessManager | null = null;

export function getProcessManager(): KanataProcessManager {
  if (!processManagerInstance) {
    processManagerInstance = new KanataProcessManager();
  }
  return processManagerInstance;
}
