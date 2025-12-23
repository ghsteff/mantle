import { spawn, ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { getKanataBinaryPath } from "./binary-path";
import { getConfigManager } from "./config-manager";

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

/**
 * Manages the Kanata child process lifecycle.
 * Provides start/stop/restart functionality and log streaming.
 */
export class KanataProcessManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private status: KanataStatus = "stopped";
  private autoRestart = false;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private restartDelay = 1000; // ms
  private restartTimeoutId: NodeJS.Timeout | null = null;
  private intentionalStop = false;

  constructor() {
    super();
  }

  /**
   * Gets the current status of the Kanata process.
   */
  getStatus(): KanataStatus {
    return this.status;
  }

  /**
   * Checks if Kanata is currently running.
   */
  isRunning(): boolean {
    return this.status === "running";
  }

  /**
   * Enables or disables auto-restart on crash.
   */
  setAutoRestart(enabled: boolean): void {
    this.autoRestart = enabled;
  }

  /**
   * Starts the Kanata process.
   */
  async start(): Promise<boolean> {
    if (this.process) {
      this.emitLog("stderr", "Kanata is already running");
      return false;
    }

    this.intentionalStop = false;
    this.setStatus("starting");

    try {
      const binaryPath = getKanataBinaryPath();
      const configPath = getConfigManager().getKbdConfigPath();

      this.emitLog("stdout", `Starting Kanata: ${binaryPath}`);
      this.emitLog("stdout", `Config: ${configPath}`);

      this.process = spawn(binaryPath, ["-c", configPath], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.setupProcessHandlers();
      this.setStatus("running");
      this.restartAttempts = 0;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emitLog("stderr", `Failed to start Kanata: ${message}`);
      this.setStatus("error");
      this.emit("error", message);
      return false;
    }
  }

  /**
   * Stops the Kanata process.
   */
  async stop(): Promise<boolean> {
    if (!this.process) {
      return true;
    }

    this.intentionalStop = true;
    this.clearRestartTimeout();

    return new Promise((resolve) => {
      if (!this.process) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown takes too long
        if (this.process) {
          this.emitLog("stderr", "Force killing Kanata process...");
          this.process.kill("SIGKILL");
        }
      }, 5000);

      this.process.once("exit", () => {
        clearTimeout(timeout);
        resolve(true);
      });

      this.emitLog("stdout", "Stopping Kanata...");
      this.process.kill("SIGTERM");
    });
  }

  /**
   * Restarts the Kanata process.
   */
  async restart(): Promise<boolean> {
    await this.stop();
    return this.start();
  }

  /**
   * Reloads the config by restarting Kanata.
   * Optionally saves new config data first.
   */
  async reloadConfig(): Promise<boolean> {
    this.emitLog("stdout", "Reloading configuration...");
    return this.restart();
  }

  /**
   * Sets up event handlers for the child process.
   */
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

      // Unexpected exit - potential crash
      this.emitLog("stderr", `Kanata exited unexpectedly (code: ${code}, signal: ${signal})`);
      this.emit("crash", code, signal);

      if (this.autoRestart && this.restartAttempts < this.maxRestartAttempts) {
        this.scheduleRestart();
      } else {
        this.setStatus("error");
        if (this.restartAttempts >= this.maxRestartAttempts) {
          this.emitLog("stderr", "Max restart attempts reached. Please check your configuration.");
        }
      }
    });
  }

  /**
   * Schedules an automatic restart after a delay.
   */
  private scheduleRestart(): void {
    this.restartAttempts++;
    const delay = this.restartDelay * this.restartAttempts; // Exponential backoff

    this.emitLog("stdout", `Attempting restart ${this.restartAttempts}/${this.maxRestartAttempts} in ${delay}ms...`);

    this.restartTimeoutId = setTimeout(() => {
      this.start();
    }, delay);
  }

  /**
   * Clears any pending restart timeout.
   */
  private clearRestartTimeout(): void {
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
  }

  /**
   * Updates the status and emits a status-change event.
   */
  private setStatus(status: KanataStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit("status-change", status);
    }
  }

  /**
   * Emits a log entry event.
   */
  private emitLog(type: "stdout" | "stderr", message: string): void {
    const entry: KanataLogEntry = {
      type,
      message,
      timestamp: Date.now(),
    };
    this.emit("log", entry);
  }

  /**
   * Cleanup when the app is closing.
   */
  async cleanup(): Promise<void> {
    this.autoRestart = false;
    this.clearRestartTimeout();
    await this.stop();
  }
}

// Singleton instance
let processManagerInstance: KanataProcessManager | null = null;

/**
 * Gets the singleton KanataProcessManager instance.
 */
export function getProcessManager(): KanataProcessManager {
  if (!processManagerInstance) {
    processManagerInstance = new KanataProcessManager();
  }
  return processManagerInstance;
}

