import type { KeyboardConfig, ProfileInfo } from "../types";
import { getKanataClient } from "./kanata-client";
import { isTauriRuntime } from "./runtime-environment";

export async function listProfilesFromRuntime() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.listProfiles();
  }

  if (!isTauriRuntime()) {
    return [] as ProfileInfo[];
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<ProfileInfo[]>("profiles_list");
  } catch (error) {
    console.warn("Failed to list profiles in tauri runtime", error);
    return [] as ProfileInfo[];
  }
}

export async function getActiveProfileFromRuntime() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.getActiveProfile();
  }

  if (!isTauriRuntime()) {
    return null;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string | null>("profiles_get_active");
  } catch (error) {
    console.warn("Failed to read active profile in tauri runtime", error);
    return null;
  }
}

export async function createProfileInRuntime(
  name: string,
  config: KeyboardConfig,
) {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.createProfile(name, config);
  }

  if (!isTauriRuntime()) {
    return true;
  }

  try {
    const now = new Date().toISOString();
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("profiles_create", {
      name,
      config,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.warn("Failed to create profile in tauri runtime", error);
    return false;
  }
}

export async function switchProfileInRuntime(name: string) {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.switchProfile(name);
  }

  if (!isTauriRuntime()) {
    return null;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<KeyboardConfig | null>("profiles_switch", { name });
  } catch (error) {
    console.warn("Failed to switch profile in tauri runtime", error);
    return null;
  }
}

export async function deleteProfileInRuntime(name: string) {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.deleteProfile(name);
  }

  if (!isTauriRuntime()) {
    return true;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("profiles_delete", { name });
  } catch (error) {
    console.warn("Failed to delete profile in tauri runtime", error);
    return false;
  }
}

export async function renameProfileInRuntime(oldName: string, newName: string) {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.renameProfile(oldName, newName);
  }

  if (!isTauriRuntime()) {
    return true;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("profiles_rename", {
      oldName,
      newName,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Failed to rename profile in tauri runtime", error);
    return false;
  }
}
