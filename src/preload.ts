// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

/**
 * IPC Channel names - keep in sync with ipc/handlers.ts
 */
const IPC_CHANNELS = {
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

  // Events from main process
  KANATA_LOG: "kanata:log",
  KANATA_STATUS_CHANGE: "kanata:status-change",
  KANATA_CRASH: "kanata:crash",
  KANATA_ERROR: "kanata:error",
} as const;

export type KanataStatus = "stopped" | "starting" | "running" | "error";

export interface KanataLogEntry {
  type: "stdout" | "stderr";
  message: string;
  timestamp: number;
}

export interface KeyboardLayer {
  name: string;
  keys: Record<string, string>;
}

export interface KeyboardConfig {
  sourceKeys: string[];
  layers: KeyboardLayer[];
  aliases?: Record<string, string>;
}

export interface ConfigPaths {
  json: string;
  kbd: string;
  dir: string;
}

export interface CrashInfo {
  code: number | null;
  signal: string | null;
}

/**
 * The API exposed to the renderer process via contextBridge.
 */
export interface KanataApi {
  // Kanata process control
  startKanata: () => Promise<boolean>;
  stopKanata: () => Promise<boolean>;
  restartKanata: () => Promise<boolean>;
  getStatus: () => Promise<KanataStatus>;
  setAutoRestart: (enabled: boolean) => Promise<void>;

  // Config management
  loadConfig: () => Promise<KeyboardConfig | null>;
  saveConfig: (config: KeyboardConfig) => Promise<boolean>;
  getConfigPaths: () => Promise<ConfigPaths>;
  backupConfig: () => Promise<string | null>;
  listBackups: () => Promise<string[]>;
  restoreBackup: (backupPath: string) => Promise<boolean>;

  // Event subscriptions
  onLog: (callback: (entry: KanataLogEntry) => void) => () => void;
  onStatusChange: (callback: (status: KanataStatus) => void) => () => void;
  onCrash: (callback: (info: CrashInfo) => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;
}

/**
 * Helper to create a subscription function that returns an unsubscribe function.
 */
function createSubscription<T>(
  channel: string,
  callback: (data: T) => void
): () => void {
  const handler = (_event: IpcRendererEvent, data: T) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

/**
 * The Kanata API exposed to the renderer.
 */
const kanataApi: KanataApi = {
  // Kanata process control
  startKanata: () => ipcRenderer.invoke(IPC_CHANNELS.START_KANATA),
  stopKanata: () => ipcRenderer.invoke(IPC_CHANNELS.STOP_KANATA),
  restartKanata: () => ipcRenderer.invoke(IPC_CHANNELS.RESTART_KANATA),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS),
  setAutoRestart: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.SET_AUTO_RESTART, enabled),

  // Config management
  loadConfig: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_CONFIG),
  saveConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG, config),
  getConfigPaths: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG_PATH),
  backupConfig: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CONFIG),
  listBackups: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_BACKUPS),
  restoreBackup: (backupPath) => ipcRenderer.invoke(IPC_CHANNELS.RESTORE_BACKUP, backupPath),

  // Event subscriptions
  onLog: (callback) => createSubscription(IPC_CHANNELS.KANATA_LOG, callback),
  onStatusChange: (callback) => createSubscription(IPC_CHANNELS.KANATA_STATUS_CHANGE, callback),
  onCrash: (callback) => createSubscription(IPC_CHANNELS.KANATA_CRASH, callback),
  onError: (callback) => createSubscription(IPC_CHANNELS.KANATA_ERROR, callback),
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld("kanata", kanataApi);

// TypeScript declaration for the window object
declare global {
  interface Window {
    kanata: KanataApi;
  }
}
