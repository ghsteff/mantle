import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { EventEmitter } from "events";

/**
 * Paths to check for Karabiner driver installation
 */
const KARABINER_DRIVER_PATHS = [
  "/Library/Application Support/org.pqrs/Karabiner-DriverKit-VirtualHIDDevice",
  "/Applications/Karabiner-Elements.app",
];

/**
 * Paths to check for Homebrew installation
 */
const HOMEBREW_PATHS = [
  "/opt/homebrew/bin/brew", // Apple Silicon
  "/usr/local/bin/brew", // Intel
];

/**
 * Check if the Karabiner driver is installed
 */
export function isKarabinerDriverInstalled(): boolean {
  return KARABINER_DRIVER_PATHS.some((path) => existsSync(path));
}

/**
 * Check if Homebrew is installed
 */
export function isHomebrewInstalled(): boolean {
  return HOMEBREW_PATHS.some((path) => existsSync(path));
}

/**
 * Get the path to the Homebrew binary
 */
export function getBrewPath(): string | null {
  for (const path of HOMEBREW_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

export interface KarabinerInstallResult {
  success: boolean;
  error?: string;
}

export interface KarabinerInstallerEvents {
  output: (line: string) => void;
  complete: (result: KarabinerInstallResult) => void;
}

/**
 * Installer class that handles Homebrew and Karabiner-Elements installation
 * with streaming output support.
 */
export class KarabinerInstaller extends EventEmitter {
  private currentProcess: ChildProcess | null = null;
  private aborted = false;

  constructor() {
    super();
  }

  /**
   * Start the installation process.
   * If Homebrew is not installed, installs it first, then installs Karabiner.
   */
  async install(): Promise<void> {
    this.aborted = false;

    if (!isHomebrewInstalled()) {
      this.emit("output", "Homebrew not found. Installing Homebrew first...\n");
      const homebrewResult = await this.installHomebrew();
      if (!homebrewResult.success) {
        this.emit("complete", homebrewResult);
        return;
      }
      this.emit("output", "\nHomebrew installed successfully.\n\n");
    }

    if (this.aborted) {
      this.emit("complete", { success: false, error: "Installation cancelled" });
      return;
    }

    this.emit("output", "Installing Karabiner-Elements...\n");
    const karabinerResult = await this.installKarabiner();
    this.emit("complete", karabinerResult);
  }

  /**
   * Cancel the ongoing installation
   */
  cancel(): void {
    this.aborted = true;
    if (this.currentProcess) {
      this.currentProcess.kill("SIGTERM");
      this.currentProcess = null;
    }
  }

  /**
   * Install Homebrew using the official install script
   */
  private async installHomebrew(): Promise<KarabinerInstallResult> {
    return new Promise((resolve) => {
      // The Homebrew install script
      const installScript =
        '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';

      // We need to run this in a way that works non-interactively
      // The NONINTERACTIVE=1 env var makes the script non-interactive
      this.currentProcess = spawn("/bin/bash", ["-c", installScript], {
        env: {
          ...process.env,
          NONINTERACTIVE: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.currentProcess.stdout?.on("data", (data: Buffer) => {
        if (!this.aborted) {
          this.emit("output", data.toString());
        }
      });

      this.currentProcess.stderr?.on("data", (data: Buffer) => {
        if (!this.aborted) {
          this.emit("output", data.toString());
        }
      });

      this.currentProcess.on("close", (code) => {
        this.currentProcess = null;
        if (this.aborted) {
          resolve({ success: false, error: "Installation cancelled" });
        } else if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `Homebrew installation failed with exit code ${code}`,
          });
        }
      });

      this.currentProcess.on("error", (err) => {
        this.currentProcess = null;
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Install Karabiner-Elements via Homebrew
   */
  private async installKarabiner(): Promise<KarabinerInstallResult> {
    return new Promise((resolve) => {
      const brewPath = getBrewPath();
      if (!brewPath) {
        resolve({
          success: false,
          error: "Homebrew not found after installation",
        });
        return;
      }

      this.currentProcess = spawn(
        brewPath,
        ["install", "--cask", "karabiner-elements"],
        {
          env: {
            ...process.env,
            HOMEBREW_NO_AUTO_UPDATE: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      this.currentProcess.stdout?.on("data", (data: Buffer) => {
        if (!this.aborted) {
          this.emit("output", data.toString());
        }
      });

      this.currentProcess.stderr?.on("data", (data: Buffer) => {
        if (!this.aborted) {
          this.emit("output", data.toString());
        }
      });

      this.currentProcess.on("close", (code) => {
        this.currentProcess = null;
        if (this.aborted) {
          resolve({ success: false, error: "Installation cancelled" });
        } else if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `Karabiner installation failed with exit code ${code}`,
          });
        }
      });

      this.currentProcess.on("error", (err) => {
        this.currentProcess = null;
        resolve({ success: false, error: err.message });
      });
    });
  }
}

// Singleton installer instance for use by IPC handlers
let installerInstance: KarabinerInstaller | null = null;

export function getKarabinerInstaller(): KarabinerInstaller {
  if (!installerInstance) {
    installerInstance = new KarabinerInstaller();
  }
  return installerInstance;
}

export function resetKarabinerInstaller(): void {
  if (installerInstance) {
    installerInstance.cancel();
    installerInstance.removeAllListeners();
    installerInstance = null;
  }
}
