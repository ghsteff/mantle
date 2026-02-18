import { ipcMain, BrowserWindow, shell, dialog } from "electron";
import {
  getConfigManager,
  getProcessManager,
  getKanataBinaryPath,
  suggestProfileName,
  type KeyboardConfig,
  type KanataStatus,
  type KanataLogEntry,
  type ParseResult,
  type ProfileInfo,
} from "../kanata";
import {
  isKarabinerDriverInstalled,
  isKarabinerAppInstalled,
  isKarabinerPkgDownloaded,
  getKarabinerPkgPath,
  isHomebrewInstalled,
  getKarabinerInstaller,
  resetKarabinerInstaller,
  launchKarabinerApp,
} from "../karabiner";
import { IPC_CHANNELS } from "./channels";

/**
 * Registers all IPC handlers for the main process.
 * Call this once after app is ready.
 */
export function registerIpcHandlers(): void {
  const processManager = getProcessManager();
  const configManager = getConfigManager();

  // ============================================
  // Kanata Process Control
  // ============================================

  ipcMain.handle(IPC_CHANNELS.START_KANATA, async (): Promise<boolean> => {
    return processManager.start();
  });

  ipcMain.handle(IPC_CHANNELS.STOP_KANATA, async (): Promise<boolean> => {
    return processManager.stop();
  });

  ipcMain.handle(IPC_CHANNELS.RESTART_KANATA, async (): Promise<boolean> => {
    return processManager.restart();
  });

  ipcMain.handle(IPC_CHANNELS.GET_STATUS, (): KanataStatus => {
    return processManager.getStatus();
  });

  // ============================================
  // Config Management
  // ============================================

  ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, (): KeyboardConfig | null => {
    return configManager.loadConfig();
  });

  ipcMain.handle(
    IPC_CHANNELS.SAVE_CONFIG,
    async (_event, config: KeyboardConfig): Promise<boolean> => {
      try {
        // Backup before saving
        configManager.backupConfig();
        configManager.saveConfig(config);

        // Reload Kanata if it's running
        if (processManager.isRunning()) {
          await processManager.reloadConfig();
        }

        return true;
      } catch (error) {
        console.error("Failed to save config:", error);
        return false;
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_CONFIG_PATH,
    (): { json: string; kbd: string; dir: string } => {
      return {
        json: configManager.getJsonConfigPath(),
        kbd: configManager.getKbdConfigPath(),
        dir: configManager.getConfigDir(),
      };
    }
  );

  ipcMain.handle(IPC_CHANNELS.BACKUP_CONFIG, (): string | null => {
    return configManager.backupConfig();
  });

  ipcMain.handle(IPC_CHANNELS.LIST_BACKUPS, (): string[] => {
    return configManager.listBackups();
  });

  ipcMain.handle(
    IPC_CHANNELS.RESTORE_BACKUP,
    async (_event, backupPath: string): Promise<boolean> => {
      const success = configManager.restoreBackup(backupPath);
      if (success && processManager.isRunning()) {
        await processManager.reloadConfig();
      }
      return success;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_KBD,
    async (): Promise<{ success: boolean; path?: string; error?: string }> => {
      const activeProfile = configManager.getActiveProfileName();
      const defaultName = activeProfile ? `${activeProfile}.kbd` : "kanata.kbd";

      const result = await dialog.showSaveDialog({
        title: "Export .kbd Configuration",
        defaultPath: defaultName,
        filters: [
          { name: "Kanata Config", extensions: ["kbd"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: "Export cancelled" };
      }

      const success = configManager.exportKbdFile(result.filePath);
      if (success) {
        return { success: true, path: result.filePath };
      }
      return { success: false, error: "Failed to export file" };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.IMPORT_KBD,
    async (): Promise<ParseResult & { suggestedName?: string }> => {
      const result = await dialog.showOpenDialog({
        title: "Import .kbd Configuration",
        filters: [
          { name: "Kanata Config", extensions: ["kbd"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: "Import cancelled" };
      }

      const filePath = result.filePaths[0];
      const parseResult = configManager.importKbdFile(filePath);

      if (parseResult.success) {
        return {
          ...parseResult,
          suggestedName: suggestProfileName(filePath),
        };
      }

      return parseResult;
    }
  );

  // ============================================
  // Profile Management
  // ============================================

  ipcMain.handle(IPC_CHANNELS.LIST_PROFILES, (): ProfileInfo[] => {
    return configManager.listProfiles();
  });

  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_PROFILE, (): string | null => {
    return configManager.getActiveProfileName();
  });

  ipcMain.handle(IPC_CHANNELS.HAS_PROFILES, (): boolean => {
    return configManager.hasProfiles();
  });

  ipcMain.handle(
    IPC_CHANNELS.CREATE_PROFILE,
    async (_event, name: string, config: KeyboardConfig): Promise<boolean> => {
      const success = configManager.createProfile(name, config);
      // If creating a profile and it's now active, reload Kanata
      if (
        success &&
        configManager.getActiveProfileName() === name &&
        processManager.isRunning()
      ) {
        await processManager.reloadConfig();
      }
      return success;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SWITCH_PROFILE,
    async (_event, name: string): Promise<KeyboardConfig | null> => {
      const config = configManager.switchProfile(name);
      // Reload Kanata with new profile's config
      if (config && processManager.isRunning()) {
        await processManager.reloadConfig();
      }
      return config;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_PROFILE,
    (_event, name: string): boolean => {
      return configManager.deleteProfile(name);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RENAME_PROFILE,
    (_event, oldName: string, newName: string): boolean => {
      return configManager.renameProfile(oldName, newName);
    }
  );

  // ============================================
  // System
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.OPEN_INPUT_MONITORING,
    async (): Promise<void> => {
      // Open macOS System Settings to Input Monitoring
      // This URL scheme opens the Privacy & Security > Input Monitoring pane
      await shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent"
      );

      // Also reveal the binary in Finder so the user can drag and drop it
      if (process.platform === "darwin") {
        const binaryPath = getKanataBinaryPath();
        shell.showItemInFolder(binaryPath);
      }
    }
  );

  // ============================================
  // Karabiner Driver Management
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.KARABINER_CHECK,
    (): {
      driverInstalled: boolean;
      appInstalled: boolean;
      pkgDownloaded: boolean;
      homebrewInstalled: boolean;
      pkgPath: string | null;
    } => {
      return {
        driverInstalled: isKarabinerDriverInstalled(),
        appInstalled: isKarabinerAppInstalled(),
        pkgDownloaded: isKarabinerPkgDownloaded(),
        homebrewInstalled: isHomebrewInstalled(),
        pkgPath: getKarabinerPkgPath(),
      };
    }
  );

  ipcMain.handle(IPC_CHANNELS.KARABINER_INSTALL, async (): Promise<boolean> => {
    // Get the main window to send events to
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows[0];

    if (!mainWindow) {
      return false;
    }

    // Reset any existing installer and create a new one
    resetKarabinerInstaller();
    const installer = getKarabinerInstaller();

    // Forward output to renderer
    installer.on("output", (line: string) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.KARABINER_INSTALL_OUTPUT, line);
      }
    });

    // Forward completion to renderer
    installer.on("complete", (result: { success: boolean; error?: string }) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.KARABINER_INSTALL_COMPLETE, result);
      }
    });

    // Start the installation (don't await - it will complete asynchronously)
    installer.install();

    return true;
  });

  ipcMain.handle(
    IPC_CHANNELS.KARABINER_CANCEL_INSTALL,
    async (): Promise<void> => {
      const installer = getKarabinerInstaller();
      installer.cancel();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.KARABINER_OPEN_PKG,
    async (): Promise<boolean> => {
      const pkgPath = getKarabinerPkgPath();
      if (pkgPath) {
        try {
          await shell.openPath(pkgPath);
          return true;
        } catch (error) {
          console.error("Failed to open pkg:", error);
          return false;
        }
      }
      return false;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.KARABINER_LAUNCH_APP,
    async (): Promise<boolean> => {
      return launchKarabinerApp();
    }
  );
}

/**
 * Sets up event forwarding from the process manager to renderer windows.
 * Call this once after creating the main window.
 */
export function setupProcessEventForwarding(mainWindow: BrowserWindow): void {
  const processManager = getProcessManager();

  // Forward log entries to renderer
  processManager.on("log", (entry: KanataLogEntry) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.KANATA_LOG, entry);
    }
  });

  // Forward status changes to renderer
  processManager.on("status-change", (status: KanataStatus) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.KANATA_STATUS_CHANGE, status);
    }
  });

  // Forward crash events to renderer
  processManager.on("crash", (code: number | null, signal: string | null) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.KANATA_CRASH, { code, signal });
    }
  });

  // Forward error events to renderer
  processManager.on("error", (error: string) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.KANATA_ERROR, error);
    }
  });

  // Forward permission denied events to renderer
  processManager.on("permission-denied", () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.KANATA_PERMISSION_DENIED);
    }
  });

  // Forward exclusive access conflict events to renderer
  processManager.on("exclusive-access-denied", () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.KANATA_EXCLUSIVE_ACCESS_DENIED);
    }
  });
}
