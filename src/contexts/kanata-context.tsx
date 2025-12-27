import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

type KanataStatus = "stopped" | "starting" | "running" | "error";

interface KanataLogEntry {
  type: "stdout" | "stderr";
  message: string;
  timestamp: number;
}

interface KanataContextValue {
  status: KanataStatus;
  logs: KanataLogEntry[];
  isRunning: boolean;
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  restart: () => Promise<boolean>;
  clearLogs: () => void;
  setAutoRestart: (enabled: boolean) => Promise<void>;
  openInputMonitoringSettings: () => Promise<void>;
}

const KanataContext = createContext<KanataContextValue | null>(null);

const MAX_LOGS = 500;

// Check if we're running in Electron with the preload script
const isElectron = typeof window !== "undefined" && window.kanata !== undefined;

export function KanataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<KanataStatus>("stopped");
  const [logs, setLogs] = useState<KanataLogEntry[]>([]);

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

    return () => {
      unsubStatus();
      unsubLog();
      unsubCrash();
      unsubError();
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

  const value: KanataContextValue = {
    status,
    logs,
    isRunning: status === "running",
    start,
    stop,
    restart,
    clearLogs,
    setAutoRestart,
    openInputMonitoringSettings,
  };

  return (
    <KanataContext.Provider value={value}>{children}</KanataContext.Provider>
  );
}

export function useKanata(): KanataContextValue {
  const context = useContext(KanataContext);
  if (!context) {
    throw new Error("useKanata must be used within a KanataProvider");
  }
  return context;
}
