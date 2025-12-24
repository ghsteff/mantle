import { spawn, ChildProcess, execSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { getKanataBinaryPath } from "./binary-path";
import { getConfigManager } from "./config-manager";
import * as sudoPrompt from "@vscode/sudo-prompt";
import * as fs from "node:fs";

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

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /[\x1B]\[[0-9;]*m/g;

/**
 * Strip ANSI color codes and classify log line
 */
function parseLogLine(
  line: string
): { clean: string; isError: boolean } | null {
  const clean = line.replace(ANSI_REGEX, "").trim();
  if (!clean) return null;

  const isError =
    clean.includes("[ERROR]") ||
    clean.includes("Permission denied") ||
    clean.includes("not permitted") ||
    clean.includes("exclusive access");

  return { clean, isError };
}

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
  private logFile = "";
  private logTailInterval: NodeJS.Timeout | null = null;
  private lastLogPosition = 0;

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
   * Find running Kanata process by name
   */
  private findKanataPid(): number | null {
    try {
      // Match kanata_macos_arm64, kanata_macos_x64, kanata_linux_x64, etc.
      // Exclude mantle processes
      const result = execSync(
        `pgrep -f 'kanata_(macos|linux|windows)' 2>/dev/null | head -1`,
        { encoding: "utf8" }
      ).trim();

      if (!result) return null;

      const pid = parseInt(result, 10);
      if (!pid || !this.isProcessRunning(pid)) return null;

      return pid;
    } catch {
      // Ignore errors
    }
    return null;
  }

  private isProcessRunning(pid: number): boolean {
    try {
      // On macOS, kanata runs as root so we can't use process.kill(pid, 0)
      // Use ps to check if the process exists instead
      const result = execSync(`ps -p ${pid} -o pid= 2>/dev/null || true`, {
        encoding: "utf8",
      }).trim();
      return result !== "";
    } catch {
      return false;
    }
  }

  /**
   * Starts the Kanata process.
   * On macOS, prompts for sudo password.
   */
  async start(): Promise<boolean> {
    // Check for existing process first
    const existingPid = this.findKanataPid();
    if (existingPid) {
      this.emitLog("stdout", `Kanata already running (PID: ${existingPid})`);
      this.setStatus("running");
      this.startProcessPolling(existingPid);
      return true;
    }

    if (this.process) {
      this.emitLog("stderr", "Kanata is already running");
      return false;
    }

    this.intentionalStop = false;
    this.setStatus("starting");

    try {
      const binaryPath = getKanataBinaryPath();
      const configPath = getConfigManager().getKbdConfigPath();

      this.emitLog("stdout", "Starting Kanata...");

      if (isMacOS) {
        await this.killStrayProcesses();
        return this.startWithSudo(binaryPath, configPath);
      } else {
        return this.startDirect(binaryPath, configPath);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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

    this.setupProcessHandlers();
    this.setStatus("running");
    this.restartAttempts = 0;
    return true;
  }

  /**
   * Start Kanata with sudo on macOS
   */
  private startWithSudo(
    binaryPath: string,
    configPath: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.logFile = `/tmp/mantle-${Date.now()}.log`;
      const command = `"${binaryPath}" -n -c "${configPath}" > "${this.logFile}" 2>&1 &`;

      this.emitLog("stdout", "Requesting administrator privileges...");

      sudoPrompt.exec(command, { name: "Mantle" }, (error) => {
        if (error) {
          if (
            error.message?.includes("canceled") ||
            error.message?.includes("cancelled")
          ) {
            this.emitLog("stdout", "Start cancelled");
          } else {
            this.emitLog("stderr", error.message);
          }
          this.setStatus("stopped");
          resolve(false);
          return;
        }

        // Wait for process to start, then verify it's running
        this.waitForKanataStart(resolve);
      });
    });
  }

  /**
   * Poll until Kanata starts or timeout
   */
  private waitForKanataStart(
    resolve: (success: boolean) => void,
    attempts = 0
  ): void {
    const maxAttempts = 5;
    const delay = 500;

    setTimeout(() => {
      const pid = this.findKanataPid();

      if (pid) {
        this.emitLog("stdout", `Kanata started (PID: ${pid})`);
        this.setStatus("running");
        this.restartAttempts = 0;
        this.startProcessPolling(pid);
        this.startLogTailing();
        resolve(true);
        return;
      }

      // Check logs for success indicators or errors
      const logContent = this.readLogFile();
      const hasSuccess =
        logContent.includes("connected") ||
        logContent.includes("driver activated") ||
        logContent.includes("Starting kanata proper");
      const hasErrors = logContent.includes("[ERROR]");

      if (hasSuccess && !hasErrors) {
        // Logs show it's working, keep waiting for PID
        if (attempts < maxAttempts) {
          this.waitForKanataStart(resolve, attempts + 1);
          return;
        }
        // Max attempts but logs show success - trust the logs
        this.emitLog("stdout", "Kanata started");
        this.setStatus("running");
        this.restartAttempts = 0;
        this.startLogTailing();
        resolve(true);
        return;
      }

      if (attempts < maxAttempts && !hasErrors) {
        // Still starting, wait more
        this.waitForKanataStart(resolve, attempts + 1);
        return;
      }

      // Failed to start
      this.showLogErrors();
      this.setStatus("error");
      resolve(false);
    }, delay);
  }

  private readLogFile(): string {
    try {
      if (this.logFile && fs.existsSync(this.logFile)) {
        return fs.readFileSync(this.logFile, "utf8");
      }
    } catch {
      // Ignore
    }
    return "";
  }

  private showLogErrors(): void {
    const content = this.readLogFile();
    if (!content.trim()) {
      this.emitLog("stderr", "Kanata process not found after start");
      return;
    }

    for (const line of content.split("\n").slice(-10)) {
      const parsed = parseLogLine(line);
      if (parsed) {
        this.emitLog(parsed.isError ? "stderr" : "stdout", parsed.clean);
        this.checkInputMonitoringError(parsed.clean);
      }
    }
  }

  private startLogTailing(): void {
    this.stopLogTailing();
    this.lastLogPosition = 0;

    this.logTailInterval = setInterval(() => {
      try {
        if (!this.logFile || !fs.existsSync(this.logFile)) return;

        const stats = fs.statSync(this.logFile);
        if (stats.size <= this.lastLogPosition) return;

        const fd = fs.openSync(this.logFile, "r");
        const buffer = Buffer.alloc(stats.size - this.lastLogPosition);
        fs.readSync(fd, buffer, 0, buffer.length, this.lastLogPosition);
        fs.closeSync(fd);

        for (const line of buffer.toString("utf8").split("\n")) {
          const parsed = parseLogLine(line);
          if (parsed) {
            this.emitLog(parsed.isError ? "stderr" : "stdout", parsed.clean);
            this.checkInputMonitoringError(parsed.clean);
          }
        }
        this.lastLogPosition = stats.size;
      } catch {
        // Ignore read errors
      }
    }, 1000);
  }

  private checkInputMonitoringError(line: string): void {
    if (line.includes("not permitted") && line.includes("IOHIDDeviceOpen")) {
      this.emitLog("stderr", "⚠️ Input Monitoring permission required!");
      this.emitLog(
        "stderr",
        "Click the button above to open System Settings and reveal the kanata binary in Finder."
      );
      this.emitLog(
        "stderr",
        "Then drag the kanata binary into the Input Monitoring list."
      );
    }
  }

  private stopLogTailing(): void {
    if (this.logTailInterval) {
      clearInterval(this.logTailInterval);
      this.logTailInterval = null;
    }
  }

  private startProcessPolling(pid: number): void {
    this.stopProcessPolling();

    this.pollInterval = setInterval(() => {
      if (!this.isProcessRunning(pid)) {
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

    // Handle direct process (non-macOS)
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
          resolve(true);
        });

        this.emitLog("stdout", "Stopping Kanata...");
        proc.kill("SIGTERM");
      });
    }

    // Handle sudo process (macOS)
    const pid = this.findKanataPid();
    if (!pid) {
      this.setStatus("stopped");
      return true;
    }

    return new Promise((resolve) => {
      this.emitLog("stdout", "Stopping Kanata...");

      sudoPrompt.exec(
        `kill ${pid} 2>/dev/null; sleep 0.5; kill -9 ${pid} 2>/dev/null; exit 0`,
        { name: "Mantle" },
        () => {
          this.setStatus("stopped");
          resolve(true);
        }
      );
    });
  }

  /**
   * Kill any stray kanata processes before starting a new one.
   */
  private async killStrayProcesses(): Promise<void> {
    const pid = this.findKanataPid();
    if (!pid) return;

    return new Promise((resolve) => {
      this.emitLog("stdout", "Cleaning up existing Kanata processes...");
      sudoPrompt.exec(
        `kill -9 ${pid} 2>/dev/null; exit 0`,
        { name: "Mantle" },
        () => setTimeout(resolve, 1000)
      );
    });
  }

  async restart(): Promise<boolean> {
    await this.stop();
    await new Promise((r) => setTimeout(r, 1500));
    return this.start();
  }

  /**
   * Reload config by restarting Kanata.
   * Note: Signal-based reload (SIGUSR1) requires kanata to be started with -l flag
   * and doesn't work reliably on macOS with sudo. Full restart is more reliable.
   */
  async reloadConfig(): Promise<boolean> {
    if (!this.findKanataPid()) {
      this.emitLog("stdout", "Kanata not running, skipping reload");
      return true;
    }

    this.emitLog("stdout", "Restarting Kanata to apply changes...");
    return this.restart();
  }

  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        this.emitLog("stdout", message);
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        this.emitLog("stderr", message);
      }
    });

    this.process.on("error", (error) => {
      this.emitLog("stderr", `Process error: ${error.message}`);
      this.setStatus("error");
      this.emit("error", error.message);
    });

    this.process.on("exit", (code, signal) => {
      this.process = null;

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
