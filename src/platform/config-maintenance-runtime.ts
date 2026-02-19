import { invokeTauriCommand, logRuntimeCommandError } from "./runtime-command-result";

export async function getConfigPathsFromRuntime() {
  const result = await invokeTauriCommand("configGetPaths");
  if (!result.success || !result.data) {
    logRuntimeCommandError("Failed to load config paths in tauri runtime", result);
    return null;
  }

  return result.data;
}

export async function backupConfigInRuntime() {
  const result = await invokeTauriCommand("configBackup");
  if (!result.success) {
    logRuntimeCommandError("Failed to back up config in tauri runtime", result);
    return null;
  }

  return result.data;
}

export async function listBackupsFromRuntime() {
  const result = await invokeTauriCommand("configListBackups");
  if (!result.success || !result.data) {
    logRuntimeCommandError("Failed to list backups in tauri runtime", result);
    return [];
  }

  return result.data;
}

export async function restoreBackupInRuntime(backupPath: string) {
  const result = await invokeTauriCommand("configRestoreBackup", {
    backupPath,
  });
  if (!result.success) {
    logRuntimeCommandError("Failed to restore backup in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}
