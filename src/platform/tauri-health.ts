import { isTauriRuntime } from "./runtime-environment";

export async function runTauriHealthCheck() {
  if (!isTauriRuntime()) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("health_check");
}
