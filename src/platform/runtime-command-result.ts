import {
  TAURI_COMMANDS,
  TAURI_EVENTS,
  type TauriCommandContract,
  type TauriCommandKey,
  type TauriEventContract,
  type TauriEventKey,
} from "./tauri-contract";

export interface RuntimeCommandResult<TData = unknown> {
  success: boolean;
  code: string;
  data: TData | null;
  error: string | null;
  details: unknown;
}

const commandOk = <TData>(data: TData): RuntimeCommandResult<TData> => ({
  success: true,
  code: "ok",
  data,
  error: null,
  details: null,
});

const commandError = (
  code: string,
  error: string,
  details: unknown,
): RuntimeCommandResult<null> => ({
  success: false,
  code,
  data: null,
  error,
  details,
});

export async function invokeTauriCommand<TCommand extends TauriCommandKey>(
  command: TCommand,
  args?: TauriCommandContract[TCommand]["args"],
) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke<TauriCommandContract[TCommand]["data"]>(
      TAURI_COMMANDS[command],
      args ? (args as Record<string, unknown>) : undefined,
    );
    return commandOk(data);
  } catch (details) {
    return commandError("invoke_failed", "Tauri command invocation failed", {
      command,
      details,
    });
  }
}

export async function listenToTauriEvent<TEvent extends TauriEventKey>(
  event: TEvent,
  handler: (payload: TauriEventContract[TEvent]) => void,
) {
  const { listen } = await import("@tauri-apps/api/event");
  return listen<TauriEventContract[TEvent]>(TAURI_EVENTS[event], (eventPayload) => {
    handler(eventPayload.payload);
  });
}

export function logRuntimeCommandError(
  message: string,
  result: RuntimeCommandResult<unknown>,
) {
  if (result.success) {
    return;
  }

  console.warn(message, {
    code: result.code,
    error: result.error,
    details: result.details,
  });
}
