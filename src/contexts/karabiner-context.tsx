import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { assertContext } from "../lib/errors";
import {
  activateDriverInRuntime,
  cancelDriverInstallInRuntime,
  checkDriverInRuntime,
  installDriverInRuntime,
  openExtensionSettingsInRuntime,
  subscribeToDriverRuntimeEvents,
} from "../platform/karabiner-runtime";

export type DriverInstallStatus = "idle" | "installing" | "success" | "error";

interface DriverState {
  driverInstalled: boolean | null;
  driverActivated: boolean | null;
  driverPendingApproval: boolean | null;
  pkgAvailable: boolean | null;
  homebrewInstalled: boolean | null;
  installStatus: DriverInstallStatus;
  installOutput: string[];
  installError: string | null;
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
  const [driverInstalled, setDriverInstalled] = useState<boolean | null>(null);
  const [driverActivated, setDriverActivated] = useState<boolean | null>(null);
  const [driverPendingApproval, setDriverPendingApproval] = useState<boolean | null>(null);
  const [pkgAvailable, setPkgAvailable] = useState<boolean | null>(null);
  const [homebrewInstalled, setHomebrewInstalled] = useState<boolean | null>(null);
  const [installStatus, setInstallStatus] = useState<DriverInstallStatus>("idle");
  const [installOutput, setInstallOutput] = useState<string[]>([]);
  const [installError, setInstallError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const result = await checkDriverInRuntime();
      setDriverInstalled(result.driverInstalled);
      setDriverActivated(result.driverActivated);
      setDriverPendingApproval(result.driverPendingApproval);
      setPkgAvailable(result.pkgAvailable);
      setHomebrewInstalled(result.homebrewInstalled);
    } catch (error) {
      console.error("Failed to check driver status:", error);
      setDriverInstalled(true);
      setDriverActivated(true);
      setDriverPendingApproval(false);
      setPkgAvailable(false);
      setHomebrewInstalled(true);
    }
  }, []);

  const startInstall = useCallback(async () => {
    setInstallStatus("installing");
    setInstallOutput([]);
    setInstallError(null);

    try {
      const success = await installDriverInRuntime();
      if (success) {
        setInstallOutput((prev) => [...prev, "Starting driver installation..."]);
      } else {
        setInstallStatus("error");
        setInstallError("Installation failed to start");
      }
    } catch (error) {
      setInstallStatus("error");
      setInstallError(error instanceof Error ? error.message : "Unknown error");
    }
  }, []);

  const cancelInstall = useCallback(async () => {
    try {
      await cancelDriverInstallInRuntime();
      setInstallStatus("idle");
      setInstallOutput([]);
    } catch (error) {
      console.error("Failed to cancel installation:", error);
    }
  }, []);

  const activateDriver = useCallback(async () => {
    try {
      const success = await activateDriverInRuntime();
      if (success) {
        setTimeout(() => {
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
    setInstallOutput([]);
    setInstallError(null);
    setInstallStatus("idle");
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    subscribeToDriverRuntimeEvents({
      onInstallOutput: (line) => {
        setInstallOutput((prev) => [...prev, line]);
      },
      onInstallComplete: (result) => {
        if (result.success) {
          setInstallStatus("success");
          void checkStatus();
          return;
        }
        setInstallStatus("error");
        setInstallError(result.error || "Installation failed");
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
  }, [checkStatus]);

  const stateValue = useMemo<DriverState>(
    () => ({
      driverInstalled,
      driverActivated,
      driverPendingApproval,
      pkgAvailable,
      homebrewInstalled,
      installStatus,
      installOutput,
      installError,
    }),
    [driverInstalled, driverActivated, driverPendingApproval, pkgAvailable, homebrewInstalled, installStatus, installOutput, installError]
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
