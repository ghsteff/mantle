import type { KanataStatus } from "../types";
import { invokeTauriCommand, logRuntimeCommandError } from "./runtime-command-result";

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
  const result = await invokeTauriCommand("kanataGetStatus");
  if (!result.success) {
    logRuntimeCommandError("Failed to get kanata status from tauri", result);
    return "error";
  }

  if (isKanataStatus(result.data)) {
    return result.data;
  }

  console.warn("Unexpected kanata status from tauri command", result.data);
  return "error";
}
