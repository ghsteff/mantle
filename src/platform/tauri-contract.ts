import type {
  ConfigPaths,
  CrashInfo,
  DriverInstallResult,
  DriverStatus,
  ExportResult,
  KanataLogEntry,
  KanataStatus,
  KeyboardConfig,
  ProfileInfo,
} from "../types";

export const TAURI_COMMANDS = {
  healthCheck: "health_check",
  kanataGetStatus: "kanata_get_status",
  kanataStart: "kanata_start",
  kanataStop: "kanata_stop",
  kanataRestart: "kanata_restart",
  openInputMonitoringSettings: "open_input_monitoring_settings",
  configLoad: "config_load",
  configSave: "config_save",
  configGetPaths: "config_get_paths",
  configBackup: "config_backup",
  configListBackups: "config_list_backups",
  configRestoreBackup: "config_restore_backup",
  configExportKbd: "config_export_kbd",
  configImportKbd: "config_import_kbd",
  profilesList: "profiles_list",
  profilesGetActive: "profiles_get_active",
  profilesHasAny: "profiles_has_any",
  profilesCreate: "profiles_create",
  profilesSwitch: "profiles_switch",
  profilesDelete: "profiles_delete",
  profilesRename: "profiles_rename",
  driverCheck: "driver_check",
  driverInstall: "driver_install",
  driverCancelInstall: "driver_cancel_install",
  driverActivate: "driver_activate_cmd",
  driverOpenPkg: "driver_open_pkg",
  driverLaunchApp: "driver_launch_app",
  openExtensionSettings: "open_extension_settings",
} as const;

export interface TauriImportKbdResult {
  success: boolean;
  filePath?: string;
  content?: string;
  error?: string;
}

export interface TauriCommandContract {
  healthCheck: { args: undefined; data: string };
  kanataGetStatus: { args: undefined; data: KanataStatus };
  kanataStart: { args: undefined; data: boolean };
  kanataStop: { args: undefined; data: boolean };
  kanataRestart: { args: undefined; data: boolean };
  openInputMonitoringSettings: { args: undefined; data: boolean };
  configLoad: { args: undefined; data: KeyboardConfig | null };
  configSave: { args: { config: KeyboardConfig }; data: boolean };
  configGetPaths: { args: undefined; data: ConfigPaths | null };
  configBackup: { args: undefined; data: string | null };
  configListBackups: { args: undefined; data: string[] };
  configRestoreBackup: { args: { backupPath: string }; data: boolean };
  configExportKbd: { args: undefined; data: ExportResult };
  configImportKbd: { args: undefined; data: TauriImportKbdResult };
  profilesList: { args: undefined; data: ProfileInfo[] };
  profilesGetActive: { args: undefined; data: string | null };
  profilesHasAny: { args: undefined; data: boolean };
  profilesCreate: {
    args: {
      name: string;
      config: KeyboardConfig;
      createdAt: string;
      updatedAt: string;
    };
    data: boolean;
  };
  profilesSwitch: { args: { name: string }; data: KeyboardConfig | null };
  profilesDelete: { args: { name: string }; data: boolean };
  profilesRename: {
    args: { oldName: string; newName: string; updatedAt: string };
    data: boolean;
  };
  driverCheck: { args: undefined; data: DriverStatus };
  driverInstall: { args: undefined; data: boolean };
  driverCancelInstall: { args: undefined; data: void };
  driverActivate: { args: undefined; data: boolean };
  driverOpenPkg: { args: undefined; data: boolean };
  driverLaunchApp: { args: undefined; data: boolean };
  openExtensionSettings: { args: undefined; data: void };
}

export type TauriCommandKey = keyof TauriCommandContract;

export const TAURI_EVENTS = {
  kanataLog: "kanata-log",
  kanataStatusChange: "kanata-status-change",
  kanataCrash: "kanata-crash",
  kanataError: "kanata-error",
  kanataPermissionDenied: "kanata-permission-denied",
  kanataExclusiveAccessDenied: "kanata-exclusive-access-denied",
  karabinerInstallOutput: "karabiner-install-output",
  karabinerInstallComplete: "karabiner-install-complete",
} as const;

export interface TauriEventContract {
  kanataLog: KanataLogEntry;
  kanataStatusChange: KanataStatus;
  kanataCrash: CrashInfo;
  kanataError: string;
  kanataPermissionDenied: undefined;
  kanataExclusiveAccessDenied: undefined;
  karabinerInstallOutput: string;
  karabinerInstallComplete: DriverInstallResult;
}

export type TauriEventKey = keyof TauriEventContract;
