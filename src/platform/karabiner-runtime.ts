import type { DriverInstallResult } from "../types";
import {
  invokeTauriCommand,
  listenToTauriEvent,
  logRuntimeCommandError,
} from "./runtime-command-result";

interface DriverRuntimeEventHandlers {
  onInstallOutput: (line: string) => void;
  onInstallComplete: (result: DriverInstallResult) => void;
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
  const result = await invokeTauriCommand("driverCheck");
  if (!result.success || !result.data) {
    logRuntimeCommandError("Failed to check driver status in tauri runtime", result);
    return {
      driverInstalled: false,
      driverActivated: false,
      driverPendingApproval: false,
      pkgAvailable: false,
      homebrewInstalled: false,
    };
  }

  return result.data;
}

export async function installDriverInRuntime() {
  const result = await invokeTauriCommand("driverInstall");
  if (!result.success) {
    logRuntimeCommandError("Failed to start driver install in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function cancelDriverInstallInRuntime() {
  const result = await invokeTauriCommand("driverCancelInstall");
  if (!result.success) {
    logRuntimeCommandError("Failed to cancel driver install in tauri runtime", result);
  }
}

export async function activateDriverInRuntime() {
  const result = await invokeTauriCommand("driverActivate");
  if (!result.success) {
    logRuntimeCommandError("Failed to activate driver in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function openExtensionSettingsInRuntime() {
  const result = await invokeTauriCommand("openExtensionSettings");
  if (!result.success) {
    logRuntimeCommandError("Failed to open extension settings in tauri runtime", result);
  }
}

export async function openKarabinerPkgInRuntime() {
  const result = await invokeTauriCommand("driverOpenPkg");
  if (!result.success) {
    logRuntimeCommandError("Failed to open Karabiner package in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function launchKarabinerAppInRuntime() {
  const result = await invokeTauriCommand("driverLaunchApp");
  if (!result.success) {
    logRuntimeCommandError("Failed to launch Karabiner app in tauri runtime", result);
    return false;
  }

  return result.data ?? false;
}

export async function subscribeToDriverRuntimeEvents(
  handlers: DriverRuntimeEventHandlers,
) {
  const unlistenOutput = await listenToTauriEvent("karabinerInstallOutput", (payload) => {
    if (typeof payload === "string") {
      handlers.onInstallOutput(payload);
    }
  });
  const unlistenComplete = await listenToTauriEvent(
    "karabinerInstallComplete",
    (payload) => {
      if (isDriverInstallResult(payload)) {
        handlers.onInstallComplete({
          success: payload.success,
          error: payload.error ?? undefined,
        });
      }
    },
  );

  return () => {
    unlistenOutput();
    unlistenComplete();
  };
}
