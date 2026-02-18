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
import { getKanataStatus } from "../platform/kanata-status";
import {
  openInputMonitoringSettingsInRuntime,
  restartKanataInRuntime,
  startKanataInRuntime,
  stopKanataInRuntime,
  subscribeToKanataRuntimeEvents,
} from "../platform/kanata-runtime";

type KanataIssue =
  | "none"
  | "permission-denied"
  | "exclusive-access-denied"
  | "admin-setup-required"
  | "admin-setup-cancelled";

interface KanataState {
  status: KanataStatus;
  logs: KanataLogEntry[];
  isRunning: boolean;
  issue: KanataIssue;
}

interface KanataActions {
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  restart: () => Promise<boolean>;
  clearLogs: () => void;
  openInputMonitoringSettings: () => Promise<void>;
  clearIssue: () => void;
}

const KanataStateContext = createContext<KanataState | null>(null);
const KanataActionsContext = createContext<KanataActions | null>(null);

export function KanataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<KanataStatus>("idle");
  const [logs, setLogs] = useState<KanataLogEntry[]>([]);
  const [issue, setIssue] = useState<KanataIssue>("none");

  const issueFromLogMessage = useCallback((message: string) => {
    const normalized = message.toLowerCase();
    if (normalized.includes("one-time admin setup required")) {
      return "admin-setup-required" as const;
    }
    return null;
  }, []);

  const issueFromErrorMessage = useCallback((message: string) => {
    const normalized = message.toLowerCase();
    if (
      normalized.includes("failed to install launchdaemon") ||
      normalized.includes("failed to prepare passwordless launchdaemon")
    ) {
      if (
        normalized.includes("user canceled") ||
        normalized.includes("user cancelled") ||
        normalized.includes("(-128)")
      ) {
        return "admin-setup-cancelled" as const;
      }
      return "admin-setup-required" as const;
    }
    return null;
  }, []);

  const appendLogEntry = useCallback((entry: KanataLogEntry) => {
    setLogs((prev) => {
      const updated = [...prev, entry];
      if (updated.length > MAX_LOGS) {
        return updated.slice(-MAX_LOGS);
      }
      return updated;
    });
  }, []);

  // Fetch initial status
  useEffect(() => {
    getKanataStatus().then(setStatus);
  }, []);

  // Subscribe to events
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    subscribeToKanataRuntimeEvents({
      onStatusChange: setStatus,
      onLog: (entry) => {
        appendLogEntry(entry);
        const nextIssue = issueFromLogMessage(entry.message);
        if (nextIssue) {
          setIssue(nextIssue);
        }
      },
      onCrash: ({ code, signal }) => {
        appendLogEntry({
          type: "stderr",
          message: `Process crashed (code: ${code}, signal: ${signal})`,
          timestamp: Date.now(),
        });
      },
      onError: (error) => {
        appendLogEntry({
          type: "stderr",
          message: `Error: ${error}`,
          timestamp: Date.now(),
        });
        const nextIssue = issueFromErrorMessage(error);
        if (nextIssue) {
          setIssue(nextIssue);
        }
      },
      onPermissionDenied: () => {
        setIssue("permission-denied");
      },
      onExclusiveAccessDenied: () => {
        setIssue("exclusive-access-denied");
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
        console.warn("Failed to subscribe to kanata runtime events", error);
      });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [appendLogEntry, issueFromErrorMessage, issueFromLogMessage]);

  const start = useCallback(async () => {
    return startKanataInRuntime();
  }, []);

  const stop = useCallback(async () => {
    return stopKanataInRuntime();
  }, []);

  const restart = useCallback(async () => {
    return restartKanataInRuntime();
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const openInputMonitoringSettings = useCallback(async () => {
    await openInputMonitoringSettingsInRuntime();
  }, []);

  const clearIssue = useCallback(() => {
    setIssue("none");
  }, []);

  const stateValue = useMemo<KanataState>(
    () => ({
      status,
      logs,
      isRunning: status === "running",
      issue,
    }),
    [status, logs, issue]
  );

  const actionsValue = useMemo<KanataActions>(
    () => ({
      start,
      stop,
      restart,
      clearLogs,
      openInputMonitoringSettings,
      clearIssue,
    }),
    [start, stop, restart, clearLogs, openInputMonitoringSettings, clearIssue]
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
