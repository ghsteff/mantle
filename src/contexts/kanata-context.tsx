import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { KanataStatus, KanataLogEntry } from "../types";
import { MAX_LOGS } from "../constants";
import { assertContext } from "../lib/errors";

interface KanataState {
  status: KanataStatus;
  logs: KanataLogEntry[];
  isRunning: boolean;
  permissionDenied: boolean;
}

interface KanataActions {
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  restart: () => Promise<boolean>;
  clearLogs: () => void;
  setAutoRestart: (enabled: boolean) => Promise<void>;
  openInputMonitoringSettings: () => Promise<void>;
  clearPermissionDenied: () => void;
}

const KanataStateContext = createContext<KanataState | null>(null);
const KanataActionsContext = createContext<KanataActions | null>(null);

// Check if we're running in Electron with the preload script
const isElectron = typeof window !== "undefined" && window.kanata !== undefined;

export function KanataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<KanataStatus>("stopped");
  const [logs, setLogs] = useState<KanataLogEntry[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Fetch initial status
  useEffect(() => {
    if (isElectron) {
      window.kanata.getStatus().then(setStatus);
    }
  }, []);

  // Subscribe to events
  useEffect(() => {
    if (!isElectron) return;

    const unsubStatus = window.kanata.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    const unsubLog = window.kanata.onLog((entry) => {
      setLogs((prev) => {
        const updated = [...prev, entry];
        // Keep only last MAX_LOGS entries
        if (updated.length > MAX_LOGS) {
          return updated.slice(-MAX_LOGS);
        }
        return updated;
      });
    });

    const unsubCrash = window.kanata.onCrash(({ code, signal }) => {
      setLogs((prev) => {
        const updated: KanataLogEntry[] = [
          ...prev,
          {
            type: "stderr" as const,
            message: `Process crashed (code: ${code}, signal: ${signal})`,
            timestamp: Date.now(),
          },
        ];
        // Keep only last MAX_LOGS entries
        if (updated.length > MAX_LOGS) {
          return updated.slice(-MAX_LOGS);
        }
        return updated;
      });
    });

    const unsubError = window.kanata.onError((error) => {
      setLogs((prev) => {
        const updated: KanataLogEntry[] = [
          ...prev,
          {
            type: "stderr" as const,
            message: `Error: ${error}`,
            timestamp: Date.now(),
          },
        ];
        // Keep only last MAX_LOGS entries
        if (updated.length > MAX_LOGS) {
          return updated.slice(-MAX_LOGS);
        }
        return updated;
      });
    });

    const unsubPermissionDenied = window.kanata.onPermissionDenied(() => {
      setPermissionDenied(true);
    });

    return () => {
      unsubStatus();
      unsubLog();
      unsubCrash();
      unsubError();
      unsubPermissionDenied();
    };
  }, []);

  const start = useCallback(async () => {
    if (!isElectron) {
      console.warn("Kanata API not available outside Electron");
      return false;
    }
    return window.kanata.startKanata();
  }, []);

  const stop = useCallback(async () => {
    if (!isElectron) return false;
    return window.kanata.stopKanata();
  }, []);

  const restart = useCallback(async () => {
    if (!isElectron) return false;
    return window.kanata.restartKanata();
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const setAutoRestart = useCallback(async (enabled: boolean) => {
    if (!isElectron) return;
    await window.kanata.setAutoRestart(enabled);
  }, []);

  const openInputMonitoringSettings = useCallback(async () => {
    if (!isElectron) return;
    await window.kanata.openInputMonitoringSettings();
  }, []);

  const clearPermissionDenied = useCallback(() => {
    setPermissionDenied(false);
  }, []);

  const stateValue = useMemo<KanataState>(
    () => ({
      status,
      logs,
      isRunning: status === "running",
      permissionDenied,
    }),
    [status, logs, permissionDenied]
  );

  const actionsValue = useMemo<KanataActions>(
    () => ({
      start,
      stop,
      restart,
      clearLogs,
      setAutoRestart,
      openInputMonitoringSettings,
      clearPermissionDenied,
    }),
    [
      start,
      stop,
      restart,
      clearLogs,
      setAutoRestart,
      openInputMonitoringSettings,
      clearPermissionDenied,
    ]
  );

  return (
    <KanataStateContext.Provider value={stateValue}>
      <KanataActionsContext.Provider value={actionsValue}>
        {children}
      </KanataActionsContext.Provider>
    </KanataStateContext.Provider>
  );
}

export function useKanataState(): KanataState {
  const context = useContext(KanataStateContext);
  assertContext(context, "useKanataState", "KanataProvider");
  return context;
}

export function useKanataActions(): KanataActions {
  const context = useContext(KanataActionsContext);
  assertContext(context, "useKanataActions", "KanataProvider");
  return context;
}

export function useKanata(): KanataState & KanataActions {
  const state = useKanataState();
  const actions = useKanataActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
