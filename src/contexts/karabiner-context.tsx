import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type KarabinerInstallStatus = "idle" | "installing" | "success" | "error";

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
  const [driverInstalled, setDriverInstalled] = useState<boolean | null>(null);
  const [appInstalled, setAppInstalled] = useState<boolean | null>(null);
  const [pkgDownloaded, setPkgDownloaded] = useState<boolean | null>(null);
  const [homebrewInstalled, setHomebrewInstalled] = useState<boolean | null>(null);
  const [pkgPath, setPkgPath] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<KarabinerInstallStatus>("idle");
  const [installOutput, setInstallOutput] = useState<string[]>([]);
  const [installError, setInstallError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!isElectron) {
      // Outside Electron (e.g., in browser dev), assume driver is installed
      setDriverInstalled(true);
      setAppInstalled(true);
      setPkgDownloaded(false);
      setHomebrewInstalled(true);
      setPkgPath(null);
      return;
    }

    try {
      const result = await window.kanata.checkKarabiner();
      setDriverInstalled(result.driverInstalled);
      setAppInstalled(result.appInstalled);
      setPkgDownloaded(result.pkgDownloaded);
      setHomebrewInstalled(result.homebrewInstalled);
      setPkgPath(result.pkgPath);
    } catch (error) {
      console.error("Failed to check Karabiner status:", error);
      // Assume installed on error to not block the user
      setDriverInstalled(true);
      setAppInstalled(true);
      setPkgDownloaded(false);
      setHomebrewInstalled(true);
      setPkgPath(null);
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

  const value: KarabinerContextValue = {
    driverInstalled,
    appInstalled,
    pkgDownloaded,
    homebrewInstalled,
    pkgPath,
    installStatus,
    installOutput,
    installError,
    checkStatus,
    startInstall,
    cancelInstall,
    clearInstallOutput,
    openPkg,
    launchApp,
  };

  return (
    <KarabinerContext.Provider value={value}>
      {children}
    </KarabinerContext.Provider>
  );
}

export function useKarabiner(): KarabinerContextValue {
  const context = useContext(KarabinerContext);
  if (!context) {
    throw new Error("useKarabiner must be used within a KarabinerProvider");
  }
  return context;
}
