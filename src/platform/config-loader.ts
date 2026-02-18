import type { KeyboardConfig } from "../types";
import { getKanataClient } from "./kanata-client";
import { isTauriRuntime } from "./runtime-environment";

export async function loadConfigFromRuntime() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.loadConfig();
  }

  if (!isTauriRuntime()) {
    return null;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<KeyboardConfig | null>("config_load");
  } catch (error) {
    console.warn("Failed to load config from tauri", error);
    return null;
  }
}
