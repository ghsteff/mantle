import type {
  CrashInfo,
  KanataLogEntry,
  KanataStatus,
} from "../types";
import { getKanataClient } from "./kanata-client";
import { KANATA_RUNTIME_EVENTS } from "./kanata-runtime-events";
import { isKanataStatus } from "./kanata-status";
import { isTauriRuntime } from "./runtime-environment";

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
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.startKanata();
  }

  if (!isTauriRuntime()) {
    return false;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("kanata_start");
  } catch (error) {
    console.warn("Failed to start kanata in tauri runtime", error);
    return false;
  }
}

export async function stopKanataInRuntime() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.stopKanata();
  }

  if (!isTauriRuntime()) {
    return false;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("kanata_stop");
  } catch (error) {
    console.warn("Failed to stop kanata in tauri runtime", error);
    return false;
  }
}

export async function restartKanataInRuntime() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.restartKanata();
  }

  if (!isTauriRuntime()) {
    return false;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("kanata_restart");
  } catch (error) {
    console.warn("Failed to restart kanata in tauri runtime", error);
    return false;
  }
}

export async function openInputMonitoringSettingsInRuntime() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    await kanataClient.openInputMonitoringSettings();
    return;
  }

  if (!isTauriRuntime()) {
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_input_monitoring_settings");
  } catch (error) {
    console.warn("Failed to open input monitoring settings in tauri runtime", error);
  }
}

export async function subscribeToKanataRuntimeEvents(
  handlers: KanataRuntimeEventHandlers,
) {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    const unsubs = [
      kanataClient.onStatusChange(handlers.onStatusChange),
      kanataClient.onLog(handlers.onLog),
      kanataClient.onCrash(handlers.onCrash),
      kanataClient.onError(handlers.onError),
      kanataClient.onPermissionDenied(handlers.onPermissionDenied),
      kanataClient.onExclusiveAccessDenied(handlers.onExclusiveAccessDenied),
    ];

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }

  if (!isTauriRuntime()) {
    return () => undefined;
  }

  const { listen } = await import("@tauri-apps/api/event");

  const unlistenStatus = await listen<unknown>(
    KANATA_RUNTIME_EVENTS.statusChange,
    (event) => {
      if (isKanataStatus(event.payload)) {
        handlers.onStatusChange(event.payload);
      }
    },
  );

  const unlistenLog = await listen<unknown>(KANATA_RUNTIME_EVENTS.log, (event) => {
    if (isKanataLogEntry(event.payload)) {
      handlers.onLog(event.payload);
    }
  });

  const unlistenCrash = await listen<unknown>(
    KANATA_RUNTIME_EVENTS.crash,
    (event) => {
      if (isCrashInfo(event.payload)) {
        handlers.onCrash(event.payload);
      }
    },
  );

  const unlistenError = await listen<string>(KANATA_RUNTIME_EVENTS.error, (event) => {
    if (typeof event.payload === "string") {
      handlers.onError(event.payload);
    }
  });

  const unlistenPermissionDenied = await listen(
    KANATA_RUNTIME_EVENTS.permissionDenied,
    () => {
      handlers.onPermissionDenied();
    },
  );

  const unlistenExclusiveAccessDenied = await listen(
    KANATA_RUNTIME_EVENTS.exclusiveAccessDenied,
    () => {
      handlers.onExclusiveAccessDenied();
    },
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
