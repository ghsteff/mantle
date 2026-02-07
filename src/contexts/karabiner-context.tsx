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

export type KarabinerInstallStatus = "idle" | "installing" | "success" | "error";

interface KarabinerStatus {
  driverInstalled: boolean | null;
  appInstalled: boolean | null;
  pkgDownloaded: boolean | null;
  homebrewInstalled: boolean | null;
  pkgPath: string | null;
}

interface KarabinerContextValue {
  driverInstalled: boolean | null;
  appInstalled: boolean | null;
  pkgDownloaded: boolean | null;
  homebrewInstalled: boolean | null;
  pkgPath: string | null;
  installStatus: KarabinerInstallStatus;
  installOutput: string[];
  installError: string | null;
  checkStatus: () => Promise<void>;
  startInstall: () => Promise<void>;
  cancelInstall: () => Promise<void>;
  clearInstallOutput: () => void;
  openPkg: () => Promise<boolean>;
  launchApp: () => Promise<boolean>;
}

const KarabinerContext = createContext<KarabinerContextValue | null>(null);

// Check if we're running in Electron with the preload script
const isElectron = typeof window !== "undefined" && window.kanata !== undefined;

export function KarabinerProvider({ children }: { children: ReactNode }) {
  const [karabinerStatus, setKarabinerStatus] = useState<KarabinerStatus | null>(
    null
  );
  const [installStatus, setInstallStatus] = useState<KarabinerInstallStatus>("idle");
  const [installOutput, setInstallOutput] = useState<string[]>([]);
  const [installError, setInstallError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!isElectron) {
      // Outside Electron (e.g., in browser dev), assume driver is installed
      setKarabinerStatus({
        driverInstalled: true,
        appInstalled: true,
        pkgDownloaded: false,
        homebrewInstalled: true,
        pkgPath: null,
      });
      return;
    }

    try {
      const result = await window.kanata.checkKarabiner();
      setKarabinerStatus({
        driverInstalled: result.driverInstalled,
        appInstalled: result.appInstalled,
        pkgDownloaded: result.pkgDownloaded,
        homebrewInstalled: result.homebrewInstalled,
        pkgPath: result.pkgPath,
      });
    } catch (error) {
      console.error("Failed to check Karabiner status:", error);
      // Assume installed on error to not block the user
      setKarabinerStatus({
        driverInstalled: true,
        appInstalled: true,
        pkgDownloaded: false,
        homebrewInstalled: true,
        pkgPath: null,
      });
    }
  }, []);

  const startInstall = useCallback(async () => {
    if (!isElectron) return;

    setInstallStatus("installing");
    setInstallOutput([]);
    setInstallError(null);

    try {
      const success = await window.kanata.installKarabiner();
      if (success) {
        setInstallStatus("success");
        // Re-check status after successful install
        await checkStatus();
      } else {
        setInstallStatus("error");
        setInstallError("Installation failed");
      }
    } catch (error) {
      setInstallStatus("error");
      setInstallError(error instanceof Error ? error.message : "Unknown error");
    }
  }, [checkStatus]);

  const cancelInstall = useCallback(async () => {
    if (!isElectron) return;

    try {
      await window.kanata.cancelKarabinerInstall();
      setInstallStatus("idle");
      setInstallOutput([]);
    } catch (error) {
      console.error("Failed to cancel installation:", error);
    }
  }, []);

  const clearInstallOutput = useCallback(() => {
    setInstallOutput([]);
    setInstallError(null);
    setInstallStatus("idle");
  }, []);

  const openPkg = useCallback(async () => {
    if (!isElectron) return false;
    try {
      return await window.kanata.openKarabinerPkg();
    } catch (error) {
      console.error("Failed to open pkg:", error);
      return false;
    }
  }, []);

  const launchApp = useCallback(async () => {
    if (!isElectron) return false;
    try {
      const success = await window.kanata.launchKarabinerApp();
      if (success) {
        // Wait a moment for the app to launch, then re-check driver status
        setTimeout(() => {
          checkStatus();
        }, 2000);
      }
      return success;
    } catch (error) {
      console.error("Failed to launch app:", error);
      return false;
    }
  }, [checkStatus]);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Subscribe to install output events
  useEffect(() => {
    if (!isElectron) return;

    const unsubOutput = window.kanata.onKarabinerInstallOutput((line: string) => {
      setInstallOutput((prev) => [...prev, line]);
    });

    const unsubComplete = window.kanata.onKarabinerInstallComplete(
      (result: { success: boolean; error?: string }) => {
        if (result.success) {
          setInstallStatus("success");
          checkStatus();
        } else {
          setInstallStatus("error");
          setInstallError(result.error || "Installation failed");
        }
      }
    );

    return () => {
      unsubOutput();
      unsubComplete();
    };
  }, [checkStatus]);

  const value = useMemo<KarabinerContextValue>(() => ({
    driverInstalled: karabinerStatus?.driverInstalled ?? null,
    appInstalled: karabinerStatus?.appInstalled ?? null,
    pkgDownloaded: karabinerStatus?.pkgDownloaded ?? null,
    homebrewInstalled: karabinerStatus?.homebrewInstalled ?? null,
    pkgPath: karabinerStatus?.pkgPath ?? null,
    installStatus,
    installOutput,
    installError,
    checkStatus,
    startInstall,
    cancelInstall,
    clearInstallOutput,
    openPkg,
    launchApp,
  }), [
    karabinerStatus,
    installStatus,
    installOutput,
    installError,
    checkStatus,
    startInstall,
    cancelInstall,
    clearInstallOutput,
    openPkg,
    launchApp,
  ]);

  return (
    <KarabinerContext.Provider value={value}>
      {children}
    </KarabinerContext.Provider>
  );
}

export function useKarabiner(): KarabinerContextValue {
  const context = useContext(KarabinerContext);
  assertContext(context, "useKarabiner", "KarabinerProvider");
  return context;
}
