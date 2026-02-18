import { ChildProcess, execSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { getKanataBinaryPath } from "./binary-path";
import { getConfigManager } from "./config-manager";
import * as sudoPrompt from "@vscode/sudo-prompt";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { KanataStatus, KanataLogEntry } from "../types";

export interface KanataProcessEvents {
  "status-change": (status: KanataStatus) => void;
  log: (entry: KanataLogEntry) => void;
  error: (error: string) => void;
  crash: (code: number | null, signal: string | null) => void;
  "permission-denied": () => void;
  "exclusive-access-denied": () => void;
}

// LaunchDaemon configuration for macOS
const DAEMON_LABEL = "com.mantle.kanata";
const DAEMON_PLIST_PATH = `/Library/LaunchDaemons/${DAEMON_LABEL}.plist`;
const DAEMON_LOG_DIR = "/var/log/mantle";
const DAEMON_STDOUT_LOG = `${DAEMON_LOG_DIR}/kanata.log`;
const DAEMON_STDERR_LOG = `${DAEMON_LOG_DIR}/kanata.error.log`;
const SUDOERS_PATH = "/etc/sudoers.d/mantle";

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /[\x1B]\[[0-9;]*m/g;

/**
 * Strip ANSI color codes and classify log line
 */
function parseLogLine(
  line: string,
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
 * Generate LaunchDaemon plist content
 */
function generatePlist(binaryPath: string, configPath: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${DAEMON_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${binaryPath}</string>
        <string>-n</string>
        <string>-c</string>
        <string>${configPath}</string>
    </array>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>${DAEMON_STDOUT_LOG}</string>
    <key>StandardErrorPath</key>
    <string>${DAEMON_STDERR_LOG}</string>
</dict>
</plist>`;
}

/**
 * Manages the Kanata child process lifecycle.
 * On macOS, uses a LaunchDaemon for passwordless start/stop after initial setup.
 */
export class KanataProcessManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private status: KanataStatus = "stopped";
  private intentionalStop = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private logFile = "";
  private logTailInterval: NodeJS.Timeout | null = null;
  private handlingPermissionError = false;
  private handlingExclusiveAccessError = false;

  getStatus(): KanataStatus {
    return this.status;
  }

  isRunning(): boolean {
    return this.status === "running";
  }

  /**
   * Check if the LaunchDaemon is installed
   */
  isDaemonInstalled(): boolean {
    try {
      return fs.existsSync(DAEMON_PLIST_PATH);
    } catch {
      return false;
    }
  }

  /**
   * Install the LaunchDaemon (one-time setup, requires password)
   * Also configures passwordless sudo for launchctl commands.
   */
  async installDaemon(): Promise<boolean> {
    const binaryPath = getKanataBinaryPath();
    const configPath = getConfigManager().getKbdConfigPath();
    const plistContent = generatePlist(binaryPath, configPath);

    // Get current username for sudoers
    const username = os.userInfo().username;

    // Sudoers content to allow passwordless launchctl for this daemon
    const sudoersContent = [
      `# Mantle - Allow passwordless control of Kanata daemon`,
      `${username} ALL=(root) NOPASSWD: /bin/launchctl bootstrap system/ ${DAEMON_PLIST_PATH}`,
      `${username} ALL=(root) NOPASSWD: /bin/launchctl bootout system/${DAEMON_LABEL}`,
      `${username} ALL=(root) NOPASSWD: /bin/launchctl kickstart -k system/${DAEMON_LABEL}`,
      `${username} ALL=(root) NOPASSWD: /bin/launchctl kickstart system/${DAEMON_LABEL}`,
      `${username} ALL=(root) NOPASSWD: /bin/launchctl kill * system/${DAEMON_LABEL}`,
      `${username} ALL=(root) NOPASSWD: /usr/bin/truncate -s 0 ${DAEMON_STDOUT_LOG} ${DAEMON_STDERR_LOG}`,
      "",
    ].join("\n");

    // Write files to temp location first
    const tempPlist = path.join(os.tmpdir(), `${DAEMON_LABEL}.plist`);
    const tempSudoers = path.join(os.tmpdir(), "mantle-sudoers");
    fs.writeFileSync(tempPlist, plistContent);
    fs.writeFileSync(tempSudoers, sudoersContent, { mode: 0o440 });

    return new Promise((resolve) => {
      this.emitLog("stdout", "Installing Kanata service (one-time setup)...");
      this.emitLog("stdout", "This requires administrator privileges.");

      // Create log directory, copy plist and sudoers, set permissions, and bootstrap daemon
      const commands = [
        `mkdir -p "${DAEMON_LOG_DIR}"`,
        `cp "${tempPlist}" "${DAEMON_PLIST_PATH}"`,
        `chown root:wheel "${DAEMON_PLIST_PATH}"`,
        `chmod 644 "${DAEMON_PLIST_PATH}"`,
        `cp "${tempSudoers}" "${SUDOERS_PATH}"`,
        `chown root:wheel "${SUDOERS_PATH}"`,
        `chmod 440 "${SUDOERS_PATH}"`,
        // Remove any stale legacy registration, then bootstrap with modern API
        `launchctl bootout system/${DAEMON_LABEL} 2>/dev/null; launchctl bootstrap system/ "${DAEMON_PLIST_PATH}"`,
      ].join(" && ");

      sudoPrompt.exec(commands, { name: "Mantle" }, (error) => {
        // Clean up temp files
        try {
          fs.unlinkSync(tempPlist);
          fs.unlinkSync(tempSudoers);
        } catch {
          // Ignore
        }

        if (error) {
          if (
            error.message?.includes("canceled") ||
            error.message?.includes("cancelled")
          ) {
            this.emitLog("stdout", "Setup cancelled");
          } else {
            this.emitLog(
              "stderr",
              `Failed to install service: ${error.message}`,
            );
          }
          resolve(false);
          return;
        }

        this.emitLog("stdout", "Kanata service installed successfully!");
        this.emitLog(
          "stdout",
          "You won't need to enter your password again to start/stop Kanata.",
        );
        resolve(true);
      });
    });
  }

  /**
   * Find running Kanata process by name
   */
  private findKanataPid(): number | null {
    try {
      // Match kanata_macos_arm64, kanata_macos_x64, kanata_linux_x64, etc.
      const result = execSync(
        `pgrep -f 'kanata_(macos|linux|windows)' 2>/dev/null | head -1`,
        { encoding: "utf8" },
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
      const result = execSync(`ps -p ${pid} -o pid= 2>/dev/null || true`, {
        encoding: "utf8",
      }).trim();
      return result !== "";
    } catch {
      return false;
    }
  }

  /**
   * Starts the Kanata process via LaunchDaemon.
   * Uses launchctl (no password after initial setup).
   */
  async start(): Promise<boolean> {
    // Check for existing process first
    const existingPid = this.findKanataPid();
    if (existingPid) {
      this.emitLog(
        "stdout",
        `Kanata already running (PID: ${existingPid}), restarting to apply latest config...`,
      );

      const stopped = await this.stop();
      if (!stopped) {
        this.emitLog("stderr", "Failed to stop existing Kanata process");
        this.setStatus("error");
        return false;
      }

      const remainingPid = this.findKanataPid();
      if (remainingPid) {
        this.emitLog(
          "stderr",
          `Existing Kanata process is still running (PID: ${remainingPid})`,
        );
        this.setStatus("error");
        return false;
      }
    }

    if (this.process) {
      this.emitLog("stderr", "Kanata is already running");
      return false;
    }

    this.intentionalStop = false;
    this.handlingPermissionError = false;
    this.setStatus("starting");

    try {
      this.emitLog("stdout", "Starting Kanata...");

      // Check if daemon is installed
      if (!this.isDaemonInstalled()) {
        this.emitLog("stdout", "First-time setup required...");
        const installed = await this.installDaemon();
        if (!installed) {
          this.setStatus("stopped");
          return false;
        }
      }

      // Start via launchctl (no password needed!)
      return this.startViaDaemon();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emitLog("stderr", `Failed to start Kanata: ${message}`);
      this.setStatus("error");
      this.emit("error", message);
      return false;
    }
  }

  /**
   * Start Kanata via LaunchDaemon (no password needed thanks to sudoers config)
   */
  private async startViaDaemon(): Promise<boolean> {
    try {
      // Clear old log files before starting so we only see fresh output
      try {
        execSync(
          `sudo -n /usr/bin/truncate -s 0 "${DAEMON_STDOUT_LOG}" "${DAEMON_STDERR_LOG}" 2>/dev/null || true`,
          { encoding: "utf8" },
        );
      } catch {
        // Ignore if truncate fails
      }

      // Use modern launchctl API — legacy `start` segfaults on macOS Sequoia
      execSync(`sudo -n /bin/launchctl kickstart -k system/${DAEMON_LABEL}`, {
        encoding: "utf8",
      });

      // Wait for process to start
      return new Promise((resolve) => {
        this.waitForKanataStartDaemon(resolve);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const needsReinstall =
        message.includes("a password is required") ||
        message.includes("cannot presently execute");

      if (needsReinstall) {
        // Either sudoers is missing/stale, or the daemon was loaded with
        // legacy APIs and needs to be re-bootstrapped with modern launchctl.
        this.emitLog("stdout", "Service needs re-setup. Re-running install...");
        const installed = await this.installDaemon();
        if (!installed) {
          this.setStatus("stopped");
          return false;
        }

        try {
          execSync(
            `sudo -n /bin/launchctl kickstart -k system/${DAEMON_LABEL}`,
            { encoding: "utf8" },
          );
          return new Promise((resolve) => {
            this.waitForKanataStartDaemon(resolve);
          });
        } catch (retryError) {
          const retryMsg =
            retryError instanceof Error
              ? retryError.message
              : String(retryError);
          this.emitLog("stderr", `Failed to start via launchctl: ${retryMsg}`);
          this.setStatus("error");
          return false;
        }
      }

      this.emitLog("stderr", `Failed to start via launchctl: ${message}`);
      this.setStatus("error");
      return false;
    }
  }

  /**
   * Poll until Kanata starts or timeout (for daemon mode)
   */
  private waitForKanataStartDaemon(
    resolve: (success: boolean) => void,
    attempts = 0,
  ): void {
    const maxAttempts = 10;
    const delay = 300;

    setTimeout(() => {
      const pid = this.findKanataPid();

      if (pid) {
        this.emitLog("stdout", `Kanata started (PID: ${pid})`);
        this.setStatus("running");
        this.startProcessPolling(pid);
        this.startLogTailing();

        // Check for startup errors even if process started
        // (it can start but fail to grab the keyboard)
        const stderrContent = this.readDaemonStderrLog();
        if (stderrContent.trim()) {
          // Show startup errors in logs and detect critical runtime failures.
          for (const line of stderrContent.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            this.emitLog("stderr", trimmed);
            this.checkCriticalRuntimeError(trimmed);
          }
        }

        resolve(true);
        return;
      }

      // Check logs for errors
      const logContent = this.readDaemonLogs();
      if (
        logContent.includes("[ERROR]") ||
        logContent.includes("not permitted")
      ) {
        this.showDaemonLogErrors();
        this.setStatus("error");
        resolve(false);
        return;
      }

      if (attempts < maxAttempts) {
        this.waitForKanataStartDaemon(resolve, attempts + 1);
        return;
      }

      // Timeout
      this.emitLog("stderr", "Kanata failed to start (timeout)");
      this.showDaemonLogErrors();
      this.setStatus("error");
      resolve(false);
    }, delay);
  }

  /**
   * Read daemon stderr log file
   */
  private readDaemonStderrLog(): string {
    try {
      if (fs.existsSync(DAEMON_STDERR_LOG)) {
        return fs.readFileSync(DAEMON_STDERR_LOG, "utf8");
      }
    } catch {
      // Ignore
    }
    return "";
  }

  /**
   * Read daemon log files
   */
  private readDaemonLogs(): string {
    let content = "";
    try {
      if (fs.existsSync(DAEMON_STDOUT_LOG)) {
        content += fs.readFileSync(DAEMON_STDOUT_LOG, "utf8");
      }
      if (fs.existsSync(DAEMON_STDERR_LOG)) {
        content += fs.readFileSync(DAEMON_STDERR_LOG, "utf8");
      }
    } catch {
      // Ignore
    }
    return content;
  }

  private showDaemonLogErrors(): void {
    const content = this.readDaemonLogs();
    if (!content.trim()) {
      this.emitLog("stderr", "No log output available");
      return;
    }

    for (const line of content.split("\n").slice(-15)) {
      const parsed = parseLogLine(line);
      if (parsed) {
        this.emitLog(parsed.isError ? "stderr" : "stdout", parsed.clean);
        this.checkCriticalRuntimeError(parsed.clean);
      }
    }
  }

  private startLogTailing(): void {
    this.stopLogTailing();

    // For daemon mode, we need to tail both stdout and stderr logs
    const isDaemonMode = this.isDaemonInstalled();

    // Track positions for both log files
    let stdoutPos = 0;
    let stderrPos = 0;

    // Start from end of files to only show new logs
    try {
      const stdoutPath = isDaemonMode ? DAEMON_STDOUT_LOG : this.logFile;
      if (stdoutPath && fs.existsSync(stdoutPath)) {
        stdoutPos = fs.statSync(stdoutPath).size;
      }
      if (isDaemonMode && fs.existsSync(DAEMON_STDERR_LOG)) {
        stderrPos = fs.statSync(DAEMON_STDERR_LOG).size;
      }
    } catch {
      // Ignore
    }

    this.logTailInterval = setInterval(() => {
      // Tail stdout log
      try {
        const stdoutPath = isDaemonMode ? DAEMON_STDOUT_LOG : this.logFile;
        if (stdoutPath && fs.existsSync(stdoutPath)) {
          const stats = fs.statSync(stdoutPath);
          if (stats.size > stdoutPos) {
            const fd = fs.openSync(stdoutPath, "r");
            const buffer = Buffer.alloc(stats.size - stdoutPos);
            fs.readSync(fd, buffer, 0, buffer.length, stdoutPos);
            fs.closeSync(fd);

            for (const line of buffer.toString("utf8").split("\n")) {
              const parsed = parseLogLine(line);
              if (parsed) {
                this.emitLog(
                  parsed.isError ? "stderr" : "stdout",
                  parsed.clean,
                );
                this.checkCriticalRuntimeError(parsed.clean);
              }
            }
            stdoutPos = stats.size;
          }
        }
      } catch {
        // Ignore read errors
      }

      // Tail stderr log (daemon mode only)
      if (isDaemonMode) {
        try {
          if (fs.existsSync(DAEMON_STDERR_LOG)) {
            const stats = fs.statSync(DAEMON_STDERR_LOG);
            if (stats.size > stderrPos) {
              const fd = fs.openSync(DAEMON_STDERR_LOG, "r");
              const buffer = Buffer.alloc(stats.size - stderrPos);
              fs.readSync(fd, buffer, 0, buffer.length, stderrPos);
              fs.closeSync(fd);

              for (const line of buffer.toString("utf8").split("\n")) {
                const trimmed = line.trim();
                if (trimmed) {
                  this.emitLog("stderr", trimmed);
                  this.checkCriticalRuntimeError(trimmed);
                }
              }
              stderrPos = stats.size;
            }
          }
        } catch {
          // Ignore read errors
        }
      }
    }, 1000);
  }

  private checkCriticalRuntimeError(line: string): void {
    const isExclusiveAccessError =
      line.includes("exclusive access") || line.includes("device already open");
    if (isExclusiveAccessError && !this.handlingExclusiveAccessError) {
      this.handlingExclusiveAccessError = true;

      this.emitLog(
        "stderr",
        "⚠️ Keyboard is already controlled by another app (e.g. Karabiner).",
      );
      this.emitLog(
        "stderr",
        "Quit other keyboard remappers, then click Start again.",
      );

      // Stop the broken process so the user can recover cleanly.
      this.emitLog("stdout", "Stopping...");
      this.stop().then(() => {
        this.handlingExclusiveAccessError = false;
        this.emit("exclusive-access-denied");
      });
      return;
    }

    if (
      line.includes("not permitted") &&
      line.includes("IOHIDDeviceOpen") &&
      !this.handlingPermissionError
    ) {
      this.handlingPermissionError = true;

      this.emitLog("stderr", "⚠️ Input Monitoring permission required!");
      this.emitLog(
        "stderr",
        "Click the button below to open System Settings and reveal the kanata binary in Finder.",
      );
      this.emitLog(
        "stderr",
        "Then drag the kanata binary into the Input Monitoring list.",
      );

      // Auto-stop the broken process so user can just click Start after fixing permissions
      // With daemon mode, this doesn't require a password!
      this.emitLog("stdout", "Stopping...");
      this.stop().then(() => {
        this.handlingPermissionError = false;
        this.emit("permission-denied");
      });
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
    this.setStatus("error");
  }

  /**
   * Stops the Kanata process.
   * On macOS with daemon: uses launchctl (no password needed).
   * On other platforms: kills the process directly.
   */
  async stop(): Promise<boolean> {
    this.intentionalStop = true;
    this.stopProcessPolling();
    this.stopLogTailing();

    // Handle direct process (we have a reference to it)
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
          this.process = null;
          this.setStatus("stopped");
          resolve(true);
        });

        this.emitLog("stdout", "Stopping Kanata...");
        proc.kill("SIGTERM");
      });
    }

    // Use launchctl if daemon is installed (no password thanks to sudoers!)
    if (this.isDaemonInstalled()) {
      try {
        this.emitLog("stdout", "Stopping Kanata...");
        execSync(`sudo -n /bin/launchctl kill SIGTERM system/${DAEMON_LABEL}`, {
          encoding: "utf8",
        });

        // Wait for process to stop
        await new Promise((r) => setTimeout(r, 500));

        // Verify it stopped
        const pid = this.findKanataPid();
        if (pid) {
          // Force kill if still running
          execSync(
            `sudo -n /bin/launchctl kill SIGKILL system/${DAEMON_LABEL} 2>/dev/null || true`,
            {
              encoding: "utf8",
            },
          );
          await new Promise((r) => setTimeout(r, 500));
        }

        this.setStatus("stopped");
        return true;
      } catch (error) {
        // launchctl might fail if daemon isn't running, that's okay
        this.setStatus("stopped");
        return true;
      }
    }

    // Handle detached process (started before daemon was installed, or external)
    const pid = this.findKanataPid();
    if (!pid) {
      this.setStatus("stopped");
      return true;
    }

    // Try to kill without sudo first
    try {
      this.emitLog("stdout", "Stopping Kanata...");
      process.kill(pid, "SIGTERM");
      await new Promise((r) => setTimeout(r, 500));

      if (this.isProcessRunning(pid)) {
        process.kill(pid, "SIGKILL");
        await new Promise((r) => setTimeout(r, 500));
      }

      if (!this.isProcessRunning(pid)) {
        this.setStatus("stopped");
        return true;
      }
    } catch {
      // Failed to kill, probably needs sudo
    }

    // Fall back to sudo for killing external processes
    return new Promise((resolve) => {
      this.emitLog("stdout", "Elevated privileges required to stop...");

      sudoPrompt.exec(
        `kill ${pid} 2>/dev/null; sleep 0.5; kill -9 ${pid} 2>/dev/null; exit 0`,
        { name: "Mantle" },
        () => {
          this.setStatus("stopped");
          resolve(true);
        },
      );
    });
  }

  async restart(): Promise<boolean> {
    await this.stop();
    await new Promise((r) => setTimeout(r, 1000));
    return this.start();
  }

  /**
   * Reload config by restarting Kanata.
   * The daemon plist points to a fixed config path, so we just need to restart.
   */
  async reloadConfig(): Promise<boolean> {
    const wasRunning = this.findKanataPid() !== null;

    if (!wasRunning) {
      this.emitLog("stdout", "Kanata not running, skipping reload");
      return true;
    }

    this.emitLog("stdout", "Restarting Kanata to apply changes...");
    return this.restart();
  }

  private setStatus(status: KanataStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit("status-change", status);
    }
  }

  private emitLog(type: "stdout" | "stderr", message: string): void {
    this.emit("log", {
      type,
      message: message.replace(ANSI_REGEX, ""),
      timestamp: Date.now(),
    });
  }

  async cleanup(): Promise<void> {
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
