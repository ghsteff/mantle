import type {
  KanataStatus,
  KanataLogEntry,
  KeyboardConfig,
  ConfigPaths,
  CrashInfo,
  ExportResult,
  ImportResult,
  ProfileInfo,
  DriverInstallResult,
} from "../types";

export interface KanataApi {
  // Kanata process control
  startKanata: () => Promise<boolean>;
  stopKanata: () => Promise<boolean>;
  restartKanata: () => Promise<boolean>;
  getStatus: () => Promise<KanataStatus>;

  // Config management
  loadConfig: () => Promise<KeyboardConfig | null>;
  saveConfig: (config: KeyboardConfig) => Promise<boolean>;
  getConfigPaths: () => Promise<ConfigPaths>;
  backupConfig: () => Promise<string | null>;
  listBackups: () => Promise<string[]>;
  restoreBackup: (backupPath: string) => Promise<boolean>;
  exportKbd: (profileName: string) => Promise<ExportResult>;
  importKbd: () => Promise<ImportResult>;

  // Profile management
  listProfiles: () => Promise<ProfileInfo[]>;
  getActiveProfile: () => Promise<string | null>;
  hasProfiles: () => Promise<boolean>;
  createProfile: (name: string, config: KeyboardConfig) => Promise<boolean>;
  switchProfile: (name: string) => Promise<KeyboardConfig | null>;
  deleteProfile: (name: string) => Promise<boolean>;
  renameProfile: (oldName: string, newName: string) => Promise<boolean>;
  duplicateProfile: (sourceName: string, newName: string) => Promise<boolean>;

  // System
  openInputMonitoringSettings: () => Promise<void>;

  // Event subscriptions
  onLog: (callback: (entry: KanataLogEntry) => void) => () => void;
  onStatusChange: (callback: (status: KanataStatus) => void) => () => void;
  onCrash: (callback: (info: CrashInfo) => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;
  onPermissionDenied: (callback: () => void) => () => void;
  onExclusiveAccessDenied: (callback: () => void) => () => void;
  onDriverInstallOutput: (callback: (line: string) => void) => () => void;
  onDriverInstallComplete: (callback: (result: DriverInstallResult) => void) => () => void;
}

declare global {
  interface Window {
    kanata?: KanataApi;
  }
}
