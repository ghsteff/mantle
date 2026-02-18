// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { IPC_CHANNELS } from "./ipc/channels";
import type { KanataApi } from "./ipc/kanata-api";

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

  // Config management
  loadConfig: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_CONFIG),
  saveConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG, config),
  getConfigPaths: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG_PATH),
  backupConfig: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CONFIG),
  listBackups: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_BACKUPS),
  restoreBackup: (backupPath) => ipcRenderer.invoke(IPC_CHANNELS.RESTORE_BACKUP, backupPath),
  exportKbd: () => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_KBD),
  importKbd: () => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_KBD),

  // Profile management
  listProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_PROFILES),
  getActiveProfile: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_PROFILE),
  hasProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.HAS_PROFILES),
  createProfile: (name, config) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_PROFILE, name, config),
  switchProfile: (name) => ipcRenderer.invoke(IPC_CHANNELS.SWITCH_PROFILE, name),
  deleteProfile: (name) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROFILE, name),
  renameProfile: (oldName, newName) => ipcRenderer.invoke(IPC_CHANNELS.RENAME_PROFILE, oldName, newName),

  // System
  openInputMonitoringSettings: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_INPUT_MONITORING),

  // Karabiner
  checkKarabiner: () => ipcRenderer.invoke(IPC_CHANNELS.KARABINER_CHECK),
  installKarabiner: () => ipcRenderer.invoke(IPC_CHANNELS.KARABINER_INSTALL),
  cancelKarabinerInstall: () => ipcRenderer.invoke(IPC_CHANNELS.KARABINER_CANCEL_INSTALL),
  openKarabinerPkg: () => ipcRenderer.invoke(IPC_CHANNELS.KARABINER_OPEN_PKG),
  launchKarabinerApp: () => ipcRenderer.invoke(IPC_CHANNELS.KARABINER_LAUNCH_APP),

  // Event subscriptions
  onLog: (callback) => createSubscription(IPC_CHANNELS.KANATA_LOG, callback),
  onStatusChange: (callback) => createSubscription(IPC_CHANNELS.KANATA_STATUS_CHANGE, callback),
  onCrash: (callback) => createSubscription(IPC_CHANNELS.KANATA_CRASH, callback),
  onError: (callback) => createSubscription(IPC_CHANNELS.KANATA_ERROR, callback),
  onPermissionDenied: (callback) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.KANATA_PERMISSION_DENIED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.KANATA_PERMISSION_DENIED, handler);
    };
  },
  onExclusiveAccessDenied: (callback) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.KANATA_EXCLUSIVE_ACCESS_DENIED, handler);
    return () => {
      ipcRenderer.removeListener(
        IPC_CHANNELS.KANATA_EXCLUSIVE_ACCESS_DENIED,
        handler,
      );
    };
  },
  onKarabinerInstallOutput: (callback) => createSubscription(IPC_CHANNELS.KARABINER_INSTALL_OUTPUT, callback),
  onKarabinerInstallComplete: (callback) => createSubscription(IPC_CHANNELS.KARABINER_INSTALL_COMPLETE, callback),
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld("kanata", kanataApi);
