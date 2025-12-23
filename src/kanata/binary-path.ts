import { app } from "electron";
import path from "node:path";
import * as fs from "node:fs";

/**
 * Get the appropriate Kanata binary path based on platform and architecture.
 * In development, binaries are in the project's bin/ folder.
 * In production, they're copied to the app's resources folder.
 */
export function getKanataBinaryPath(): string {
  const isDev = !app.isPackaged;
  const platform = process.platform;
  const arch = process.arch;

  console.log("[Kanata] Resolving binary path...");
  console.log("[Kanata] isDev:", isDev);
  console.log("[Kanata] platform:", platform);
  console.log("[Kanata] arch:", arch);

  let binaryName: string;

  if (platform === "win32") {
    binaryName =
      arch === "arm64"
        ? "kanata_windows_gui_winIOv2_arm64.exe"
        : "kanata_windows_gui_winIOv2_x64.exe";
  } else if (platform === "darwin") {
    binaryName = arch === "arm64" ? "kanata_macos_arm64" : "kanata_macos_x64";
  } else {
    // Linux
    binaryName = "kanata_linux_x64";
  }

  console.log("[Kanata] binaryName:", binaryName);

  let binaryPath: string;

  if (isDev) {
    // In development, go up from .vite/build to project root, then into bin/
    binaryPath = path.join(__dirname, "..", "..", "bin", binaryName);
  } else {
    // In production, binaries are in the resources folder
    binaryPath = path.join(process.resourcesPath, binaryName);
  }

  console.log("[Kanata] Resolved binary path:", binaryPath);

  // Check if the file exists
  if (fs.existsSync(binaryPath)) {
    console.log("[Kanata] Binary exists: YES");
    // Check if executable (on Unix)
    if (platform !== "win32") {
      try {
        fs.accessSync(binaryPath, fs.constants.X_OK);
        console.log("[Kanata] Binary is executable: YES");
      } catch {
        console.log("[Kanata] Binary is executable: NO - will try to chmod");
        try {
          fs.chmodSync(binaryPath, 0o755);
          console.log("[Kanata] chmod successful");
        } catch (e) {
          console.error("[Kanata] Failed to chmod:", e);
        }
      }
    }
  } else {
    console.error("[Kanata] Binary exists: NO");
    console.error("[Kanata] __dirname:", __dirname);
    console.error("[Kanata] process.resourcesPath:", process.resourcesPath);

    // List what's in resourcesPath for debugging
    if (!isDev) {
      try {
        const files = fs.readdirSync(process.resourcesPath);
        console.log("[Kanata] Files in resourcesPath:", files);
      } catch (e) {
        console.error("[Kanata] Failed to list resourcesPath:", e);
      }
    }
  }

  return binaryPath;
}
