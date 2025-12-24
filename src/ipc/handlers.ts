import { ipcMain, BrowserWindow, shell } from "electron";
import {
  getConfigManager,
  getProcessManager,
  getKanataBinaryPath,
  type KeyboardConfig,
  type KanataStatus,
  type KanataLogEntry,
} from "../kanata";
import type { ProfileInfo } from "../kanata/config-manager";

/**
 * IPC Channel names - keep in sync with preload.ts
 */
export const IPC_CHANNELS = {
  // Kanata process control
  START_KANATA: "kanata:start",
  STOP_KANATA: "kanata:stop",
  RESTART_KANATA: "kanata:restart",
  GET_STATUS: "kanata:get-status",
  SET_AUTO_RESTART: "kanata:set-auto-restart",

  // Config management
  LOAD_CONFIG: "config:load",
  SAVE_CONFIG: "config:save",
  GET_CONFIG_PATH: "config:get-path",
  BACKUP_CONFIG: "config:backup",
  LIST_BACKUPS: "config:list-backups",
  RESTORE_BACKUP: "config:restore-backup",

  // Profile management
  LIST_PROFILES: "profiles:list",
  GET_ACTIVE_PROFILE: "profiles:get-active",
  HAS_PROFILES: "profiles:has-any",
  CREATE_PROFILE: "profiles:create",
  SWITCH_PROFILE: "profiles:switch",
  DELETE_PROFILE: "profiles:delete",
  RENAME_PROFILE: "profiles:rename",

  // System
  OPEN_INPUT_MONITORING: "system:open-input-monitoring",

  // Events sent to renderer (via webContents.send)
  KANATA_LOG: "kanata:log",
  KANATA_STATUS_CHANGE: "kanata:status-change",
  KANATA_CRASH: "kanata:crash",
  KANATA_ERROR: "kanata:error",
} as const;

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

  ipcMain.handle(IPC_CHANNELS.SET_AUTO_RESTART, (_event, enabled: boolean): void => {
    processManager.setAutoRestart(enabled);
  });

  // ============================================
  // Config Management
  // ============================================

  ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, (): KeyboardConfig | null => {
    return configManager.loadConfig();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, async (_event, config: KeyboardConfig): Promise<boolean> => {
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
  });

  ipcMain.handle(IPC_CHANNELS.GET_CONFIG_PATH, (): { json: string; kbd: string; dir: string } => {
    return {
      json: configManager.getJsonConfigPath(),
      kbd: configManager.getKbdConfigPath(),
      dir: configManager.getConfigDir(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_CONFIG, (): string | null => {
    return configManager.backupConfig();
  });

  ipcMain.handle(IPC_CHANNELS.LIST_BACKUPS, (): string[] => {
    return configManager.listBackups();
  });

  ipcMain.handle(IPC_CHANNELS.RESTORE_BACKUP, async (_event, backupPath: string): Promise<boolean> => {
    const success = configManager.restoreBackup(backupPath);
    if (success && processManager.isRunning()) {
      await processManager.reloadConfig();
    }
    return success;
  });

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
      if (success && configManager.getActiveProfileName() === name && processManager.isRunning()) {
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

  ipcMain.handle(IPC_CHANNELS.DELETE_PROFILE, (_event, name: string): boolean => {
    return configManager.deleteProfile(name);
  });

  ipcMain.handle(
    IPC_CHANNELS.RENAME_PROFILE,
    (_event, oldName: string, newName: string): boolean => {
      return configManager.renameProfile(oldName, newName);
    }
  );

  // ============================================
  // System
  // ============================================

  ipcMain.handle(IPC_CHANNELS.OPEN_INPUT_MONITORING, async (): Promise<void> => {
    // Open macOS System Settings to Input Monitoring
    // This URL scheme opens the Privacy & Security > Input Monitoring pane
    await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent");

    // Also reveal the binary in Finder so the user can drag and drop it
    if (process.platform === "darwin") {
      const binaryPath = getKanataBinaryPath();
      shell.showItemInFolder(binaryPath);
    }
  });
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
}
