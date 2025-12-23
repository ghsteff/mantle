import { app } from "electron";
import path from "node:path";

/**
 * Get the appropriate Kanata binary path based on platform and architecture.
 * In development, binaries are in the project's bin/ folder.
 * In production, they're copied to the app's resources folder.
 */
export function getKanataBinaryPath(): string {
  const isDev = !app.isPackaged;
  const platform = process.platform;
  const arch = process.arch;

  let binaryName: string;

  if (platform === "win32") {
    binaryName = arch === "arm64"
      ? "kanata_windows_gui_winIOv2_arm64.exe"
      : "kanata_windows_gui_winIOv2_x64.exe";
  } else if (platform === "darwin") {
    binaryName = arch === "arm64"
      ? "kanata_macos_arm64"
      : "kanata_macos_x64";
  } else {
    // Linux
    binaryName = "kanata_linux_x64";
  }

  if (isDev) {
    // In development, go up from .vite/build to project root, then into bin/
    return path.join(__dirname, "..", "..", "bin", binaryName);
  } else {
    // In production, binaries are in the resources folder
    return path.join(process.resourcesPath, binaryName);
  }
}

