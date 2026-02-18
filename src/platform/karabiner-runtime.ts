import type { DriverInstallResult, DriverStatus } from "../types";
import { KARABINER_RUNTIME_EVENTS } from "./karabiner-runtime-events";
import { isTauriRuntime } from "./runtime-environment";

interface DriverRuntimeEventHandlers {
  onInstallOutput: (line: string) => void;
  onInstallComplete: (result: DriverInstallResult) => void;
}

function fallbackDriverStatus(): DriverStatus {
  return {
    driverInstalled: true,
    driverActivated: true,
    driverPendingApproval: false,
    pkgAvailable: false,
    homebrewInstalled: true,
  };
}

function isDriverInstallResult(
  value: unknown,
): value is DriverInstallResult & { error?: string | null } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<DriverInstallResult> & {
    error?: string | null;
  };
  const hasError =
    candidate.error === undefined ||
    candidate.error === null ||
    typeof candidate.error === "string";
  return typeof candidate.success === "boolean" && hasError;
}

export async function checkDriverInRuntime() {
  if (!isTauriRuntime()) {
    return fallbackDriverStatus();
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<DriverStatus>("driver_check");
  } catch (error) {
    console.warn("Failed to check driver status in tauri runtime", error);
    return fallbackDriverStatus();
  }
}

export async function installDriverInRuntime() {
  if (!isTauriRuntime()) {
    return false;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("driver_install");
  } catch (error) {
    console.warn("Failed to start driver install in tauri runtime", error);
    return false;
  }
}

export async function cancelDriverInstallInRuntime() {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("driver_cancel_install");
  } catch (error) {
    console.warn("Failed to cancel driver install in tauri runtime", error);
  }
}

export async function activateDriverInRuntime() {
  if (!isTauriRuntime()) {
    return true;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("driver_activate_cmd");
  } catch (error) {
    console.warn("Failed to activate driver in tauri runtime", error);
    return false;
  }
}

export async function openExtensionSettingsInRuntime() {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_extension_settings");
  } catch (error) {
    console.warn("Failed to open extension settings in tauri runtime", error);
  }
}

export async function subscribeToDriverRuntimeEvents(
  handlers: DriverRuntimeEventHandlers,
) {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  const { listen } = await import("@tauri-apps/api/event");
  const unlistenOutput = await listen<unknown>(
    KARABINER_RUNTIME_EVENTS.installOutput,
    (event) => {
      if (typeof event.payload === "string") {
        handlers.onInstallOutput(event.payload);
      }
    },
  );
  const unlistenComplete = await listen<unknown>(
    KARABINER_RUNTIME_EVENTS.installComplete,
    (event) => {
      if (isDriverInstallResult(event.payload)) {
        handlers.onInstallComplete({
          success: event.payload.success,
          error: event.payload.error ?? undefined,
        });
      }
    },
  );

  return () => {
    unlistenOutput();
    unlistenComplete();
  };
}
