import type { KeyboardConfig } from "../types";
import { getKanataClient } from "./kanata-client";
import { isTauriRuntime } from "./runtime-environment";

export async function saveConfigToRuntime(config: KeyboardConfig) {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.saveConfig(config);
  }

  if (!isTauriRuntime()) {
    return true;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("config_save", { config });
  } catch (error) {
    console.warn("Failed to save config in tauri runtime", error);
    return false;
  }
}
