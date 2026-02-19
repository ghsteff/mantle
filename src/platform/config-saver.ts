import type { KeyboardConfig } from "../types";
import { invokeTauriCommand, logRuntimeCommandError } from "./runtime-command-result";

export async function saveConfigToRuntime(config: KeyboardConfig) {
  const result = await invokeTauriCommand("configSave", {
    config,
  });
  if (!result.success) {
    logRuntimeCommandError("Failed to save config in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}
