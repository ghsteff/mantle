import type {
  CrashInfo,
  KanataLogEntry,
  KanataStatus,
} from "../types";
import { isKanataStatus } from "./kanata-status";
import {
  invokeTauriCommand,
  listenToTauriEvent,
  logRuntimeCommandError,
} from "./runtime-command-result";

interface KanataRuntimeEventHandlers {
  onStatusChange: (status: KanataStatus) => void;
  onLog: (entry: KanataLogEntry) => void;
  onCrash: (info: CrashInfo) => void;
  onError: (error: string) => void;
  onPermissionDenied: () => void;
  onExclusiveAccessDenied: () => void;
}

function isKanataLogEntry(value: unknown): value is KanataLogEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<KanataLogEntry>;
  const validType = candidate.type === "stdout" || candidate.type === "stderr";
  return (
    validType &&
    typeof candidate.message === "string" &&
    typeof candidate.timestamp === "number"
  );
}

function isCrashInfo(value: unknown): value is CrashInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<CrashInfo>;
  const hasValidCode = candidate.code === null || typeof candidate.code === "number";
  const hasValidSignal =
    candidate.signal === null || typeof candidate.signal === "string";

  return hasValidCode && hasValidSignal;
}

export async function startKanataInRuntime() {
  const result = await invokeTauriCommand("kanataStart");
  if (!result.success) {
    logRuntimeCommandError("Failed to start kanata in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function stopKanataInRuntime() {
  const result = await invokeTauriCommand("kanataStop");
  if (!result.success) {
    logRuntimeCommandError("Failed to stop kanata in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function restartKanataInRuntime() {
  const result = await invokeTauriCommand("kanataRestart");
  if (!result.success) {
    logRuntimeCommandError("Failed to restart kanata in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function openInputMonitoringSettingsInRuntime() {
  const result = await invokeTauriCommand("openInputMonitoringSettings");
  if (!result.success) {
    logRuntimeCommandError(
      "Failed to open input monitoring settings in tauri runtime",
      result,
    );
  }
}

export async function subscribeToKanataRuntimeEvents(
  handlers: KanataRuntimeEventHandlers,
) {
  const unlistenStatus = await listenToTauriEvent("kanataStatusChange", (payload) => {
    if (isKanataStatus(payload)) {
      handlers.onStatusChange(payload);
    }
  });

  const unlistenLog = await listenToTauriEvent("kanataLog", (payload) => {
    if (isKanataLogEntry(payload)) {
      handlers.onLog(payload);
    }
  });

  const unlistenCrash = await listenToTauriEvent("kanataCrash", (payload) => {
    if (isCrashInfo(payload)) {
      handlers.onCrash(payload);
    }
  });

  const unlistenError = await listenToTauriEvent("kanataError", (payload) => {
    if (typeof payload === "string") {
      handlers.onError(payload);
    }
  });

  const unlistenPermissionDenied = await listenToTauriEvent(
    "kanataPermissionDenied",
    () => handlers.onPermissionDenied(),
  );

  const unlistenExclusiveAccessDenied = await listenToTauriEvent(
    "kanataExclusiveAccessDenied",
    () => handlers.onExclusiveAccessDenied(),
  );

  return () => {
    unlistenStatus();
    unlistenLog();
    unlistenCrash();
    unlistenError();
    unlistenPermissionDenied();
    unlistenExclusiveAccessDenied();
  };
}
