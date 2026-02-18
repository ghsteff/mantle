import type { KanataStatus } from "../types";
import { getKanataClient } from "./kanata-client";
import { isTauriRuntime } from "./runtime-environment";

export function isKanataStatus(value: unknown): value is KanataStatus {
  return (
    value === "idle" ||
    value === "stopped" ||
    value === "starting" ||
    value === "running" ||
    value === "stopping" ||
    value === "error"
  );
}

export async function getKanataStatus() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.getStatus();
  }

  if (!isTauriRuntime()) {
    return "stopped";
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const status = await invoke<unknown>("kanata_get_status");
    if (isKanataStatus(status)) {
      return status;
    }

    console.warn("Unexpected kanata status from tauri command", status);
    return "error";
  } catch (error) {
    console.warn("Failed to get kanata status from tauri", error);
    return "error";
  }
}
