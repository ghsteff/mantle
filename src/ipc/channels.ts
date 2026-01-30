/**
 * IPC Channel names - single source of truth for main and preload processes.
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
  EXPORT_KBD: "config:export-kbd",
  IMPORT_KBD: "config:import-kbd",

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

  // Karabiner
  KARABINER_CHECK: "karabiner:check",
  KARABINER_INSTALL: "karabiner:install",
  KARABINER_CANCEL_INSTALL: "karabiner:cancel-install",
  KARABINER_OPEN_PKG: "karabiner:open-pkg",
  KARABINER_LAUNCH_APP: "karabiner:launch-app",

  // Events sent to renderer (via webContents.send)
  KANATA_LOG: "kanata:log",
  KANATA_STATUS_CHANGE: "kanata:status-change",
  KANATA_CRASH: "kanata:crash",
  KANATA_ERROR: "kanata:error",
  KANATA_PERMISSION_DENIED: "kanata:permission-denied",
  KARABINER_INSTALL_OUTPUT: "karabiner:install-output",
  KARABINER_INSTALL_COMPLETE: "karabiner:install-complete",
} as const;
