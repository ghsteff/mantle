import { invokeTauriCommand, logRuntimeCommandError } from "./runtime-command-result";

export async function loadConfigFromRuntime() {
  const result = await invokeTauriCommand("configLoad");
  if (!result.success) {
    logRuntimeCommandError("Failed to load config from tauri", result);
    return null;
  }

  return result.data;
}
