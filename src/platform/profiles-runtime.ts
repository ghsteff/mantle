import type { KeyboardConfig, ProfileInfo } from "../types";
import { invokeTauriCommand, logRuntimeCommandError } from "./runtime-command-result";

export async function listProfilesFromRuntime() {
  const result = await invokeTauriCommand("profilesList");
  if (!result.success || !result.data) {
    logRuntimeCommandError("Failed to list profiles in tauri runtime", result);
    return [] as ProfileInfo[];
  }

  return result.data;
}

export async function getActiveProfileFromRuntime() {
  const result = await invokeTauriCommand("profilesGetActive");
  if (!result.success) {
    logRuntimeCommandError("Failed to read active profile in tauri runtime", result);
    return null;
  }

  return result.data;
}

export async function hasProfilesInRuntime() {
  const result = await invokeTauriCommand("profilesHasAny");
  if (!result.success) {
    logRuntimeCommandError("Failed to check profiles presence in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function createProfileInRuntime(
  name: string,
  config: KeyboardConfig,
) {
  const now = new Date().toISOString();
  const result = await invokeTauriCommand("profilesCreate", {
    name,
    config,
    createdAt: now,
    updatedAt: now,
  });
  if (!result.success) {
    logRuntimeCommandError("Failed to create profile in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function switchProfileInRuntime(name: string) {
  const result = await invokeTauriCommand("profilesSwitch", { name });
  if (!result.success) {
    logRuntimeCommandError("Failed to switch profile in tauri runtime", result);
    return null;
  }

  return result.data;
}

export async function deleteProfileInRuntime(name: string) {
  const result = await invokeTauriCommand("profilesDelete", {
    name,
  });
  if (!result.success) {
    logRuntimeCommandError("Failed to delete profile in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function renameProfileInRuntime(oldName: string, newName: string) {
  const result = await invokeTauriCommand("profilesRename", {
    oldName,
    newName,
    updatedAt: new Date().toISOString(),
  });
  if (!result.success) {
    logRuntimeCommandError("Failed to rename profile in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function duplicateProfileInRuntime(sourceName: string, newName: string) {
  const result = await invokeTauriCommand("profilesDuplicate", {
    sourceName,
    newName,
    createdAt: new Date().toISOString(),
  });
  if (!result.success) {
    logRuntimeCommandError("Failed to duplicate profile in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}
