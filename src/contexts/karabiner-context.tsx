import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { DriverStatus } from "../types";
import { assertContext } from "../lib/errors";
import {
  activateDriverInRuntime,
  cancelDriverInstallInRuntime,
  checkDriverInRuntime,
  installDriverInRuntime,
  openExtensionSettingsInRuntime,
  subscribeToDriverRuntimeEvents,
} from "../platform/karabiner-runtime";

export type DriverReadiness =
  | "checking"
  | "missing-driver"
  | "awaiting-approval"
  | "ready";

export type DriverInstallFlow =
  | { status: "idle"; output: string[]; error: null }
  | { status: "installing"; output: string[]; error: null }
  | { status: "success"; output: string[]; error: null }
  | { status: "error"; output: string[]; error: string };

interface DriverState {
  readiness: DriverReadiness;
  status: DriverStatus | null;
  installFlow: DriverInstallFlow;
}

interface DriverActions {
  checkStatus: () => Promise<void>;
  startInstall: () => Promise<void>;
  cancelInstall: () => Promise<void>;
  activateDriver: () => Promise<boolean>;
  openExtensionSettings: () => Promise<void>;
  clearInstallOutput: () => void;
}

const DriverStateContext = createContext<DriverState | null>(null);
const DriverActionsContext = createContext<DriverActions | null>(null);

export function KarabinerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DriverStatus | null>(null);
  const [readiness, setReadiness] = useState<DriverReadiness>("checking");
  const [installFlow, setInstallFlow] = useState<DriverInstallFlow>({
    status: "idle",
    output: [],
    error: null,
  });
  const checkStatusTimeoutRef = useRef<number | null>(null);

  const mapReadiness = useCallback((nextStatus: DriverStatus): DriverReadiness => {
    if (nextStatus.driverInstalled && nextStatus.driverActivated) {
      return "ready";
    }
    if (nextStatus.driverInstalled) {
      return "awaiting-approval";
    }
    return "missing-driver";
  }, []);

  const appendInstallOutput = useCallback((line: string) => {
    setInstallFlow((prev) => ({ ...prev, output: [...prev.output, line] }));
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const nextStatus = await checkDriverInRuntime();
      setStatus(nextStatus);
      setReadiness(mapReadiness(nextStatus));
    } catch (error) {
      console.error("Failed to check driver status:", error);
      setStatus(null);
      setReadiness("checking");
    }
  }, [mapReadiness]);

  const startInstall = useCallback(async () => {
    setInstallFlow({ status: "installing", output: [], error: null });

    try {
      const success = await installDriverInRuntime();
      if (success) {
        appendInstallOutput("Starting driver installation...");
      } else {
        setInstallFlow({
          status: "error",
          output: [],
          error: "Installation failed to start",
        });
      }
    } catch (error) {
      setInstallFlow({
        status: "error",
        output: [],
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [appendInstallOutput]);

  const cancelInstall = useCallback(async () => {
    try {
      await cancelDriverInstallInRuntime();
      setInstallFlow({ status: "idle", output: [], error: null });
    } catch (error) {
      console.error("Failed to cancel installation:", error);
    }
  }, []);

  const activateDriver = useCallback(async () => {
    try {
      const success = await activateDriverInRuntime();
      if (success) {
        if (checkStatusTimeoutRef.current !== null) {
          window.clearTimeout(checkStatusTimeoutRef.current);
        }
        checkStatusTimeoutRef.current = window.setTimeout(() => {
          checkStatus();
        }, 2000);
      }
      return success;
    } catch (error) {
      console.error("Failed to activate driver:", error);
      return false;
    }
  }, [checkStatus]);

  const openExtensionSettings = useCallback(async () => {
    await openExtensionSettingsInRuntime();
  }, []);

  const clearInstallOutput = useCallback(() => {
    setInstallFlow({ status: "idle", output: [], error: null });
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    return () => {
      if (checkStatusTimeoutRef.current !== null) {
        window.clearTimeout(checkStatusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    subscribeToDriverRuntimeEvents({
      onInstallOutput: (line) => {
        appendInstallOutput(line);
      },
      onInstallComplete: (result) => {
        if (result.success) {
          setInstallFlow((prev) => ({
            status: "success",
            output: prev.output,
            error: null,
          }));
          void checkStatus();
          return;
        }
        setInstallFlow((prev) => ({
          status: "error",
          output: prev.output,
          error: result.error || "Installation failed",
        }));
      },
    })
      .then((runtimeUnsubscribe) => {
        if (!isMounted) {
          runtimeUnsubscribe();
          return;
        }
        unsubscribe = runtimeUnsubscribe;
      })
      .catch((error) => {
        console.warn("Failed to subscribe to driver runtime events", error);
      });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [appendInstallOutput, checkStatus]);

  const stateValue = useMemo<DriverState>(
    () => ({
      readiness,
      status,
      installFlow,
    }),
    [readiness, status, installFlow]
  );

  const actionsValue = useMemo<DriverActions>(
    () => ({
      checkStatus,
      startInstall,
      cancelInstall,
      activateDriver,
      openExtensionSettings,
      clearInstallOutput,
    }),
    [checkStatus, startInstall, cancelInstall, activateDriver, openExtensionSettings, clearInstallOutput]
  );

  return (
    <DriverStateContext.Provider value={stateValue}>
      <DriverActionsContext.Provider value={actionsValue}>
        {children}
      </DriverActionsContext.Provider>
    </DriverStateContext.Provider>
  );
}

export function useKarabinerState(): DriverState {
  const context = useContext(DriverStateContext);
  assertContext(context, "useKarabinerState", "KarabinerProvider");
  return context;
}

export function useKarabinerActions(): DriverActions {
  const context = useContext(DriverActionsContext);
  assertContext(context, "useKarabinerActions", "KarabinerProvider");
  return context;
}

export function useKarabiner(): DriverState & DriverActions {
  const state = useKarabinerState();
  const actions = useKarabinerActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
