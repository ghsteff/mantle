import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { KeyboardConfig, ExportResult, ImportResult } from "../types";
import { useConfigActionsInternal, useConfigState } from "./config-context";
import { useUIActions, useUIState } from "./ui-context";
import { toErrorMessage, assertContext } from "../lib/errors";

interface ProfileContextValue {
  createProfile: (name: string, config: KeyboardConfig) => Promise<boolean>;
  switchProfile: (name: string) => Promise<boolean>;
  deleteProfile: (name: string) => Promise<boolean>;
  renameProfile: (oldName: string, newName: string) => Promise<boolean>;
  refreshProfiles: () => Promise<void>;
  exportKbd: () => Promise<ExportResult>;
  importKbd: () => Promise<ImportResult>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

// Check if we're running in Electron with the preload script
const isElectron = typeof window !== "undefined" && window.kanata !== undefined;

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isDirty, activeProfile } = useConfigState();
  const {
    setConfig,
    setActiveProfile,
    setProfiles,
    setIsDirty,
    setError,
    loadConfig,
  } = useConfigActionsInternal();

  const { activeLayer } = useUIState();
  const { setActiveLayer, setSelectedKey } = useUIActions();
  const hasInitialized = useRef(false);

  // Load profiles list
  const refreshProfiles = useCallback(async () => {
    if (!isElectron) {
      // Mock data for development
      setProfiles([{ name: "default", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
      setActiveProfile("default");
      return;
    }

    try {
      const [profilesList, active] = await Promise.all([
        window.kanata.listProfiles(),
        window.kanata.getActiveProfile(),
      ]);
      setProfiles(profilesList);
      setActiveProfile(active);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    }
  }, [setProfiles, setActiveProfile]);

  // Initialize on mount: refresh profiles, load config, set active layer
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      const [, loadedConfig] = await Promise.all([
        refreshProfiles(),
        loadConfig(),
      ]);
      if (loadedConfig) {
        // Set active layer to first layer if current isn't in the config
        const layerExists = loadedConfig.layers.find((l) => l.name === activeLayer);
        if (!layerExists) {
          setActiveLayer(loadedConfig.layers[0]?.name || "base");
        }
      }
    };
    initialize();
  }, [refreshProfiles, loadConfig, activeLayer, setActiveLayer]);

  const createProfile = useCallback(async (name: string, profileConfig: KeyboardConfig): Promise<boolean> => {
    if (!isElectron) {
      console.log("Would create profile:", name, profileConfig);
      return true;
    }

    try {
      const success = await window.kanata.createProfile(name, profileConfig);
      if (success) {
        await refreshProfiles();
        // If this is the first profile or it became active, load it
        const newActive = await window.kanata.getActiveProfile();
        if (newActive === name) {
          setConfig(profileConfig);
          setActiveLayer(profileConfig.layers[0]?.name || "base");
        }
      }
      return success;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to create profile"));
      return false;
    }
  }, [refreshProfiles, setConfig, setActiveLayer, setError]);

  const switchProfile = useCallback(async (name: string): Promise<boolean> => {
    if (!isElectron) {
      console.log("Would switch to profile:", name);
      return true;
    }

    // Don't switch if there are unsaved changes
    if (isDirty) {
      const confirmed = confirm("You have unsaved changes. Discard and switch profiles?");
      if (!confirmed) return false;
    }

    try {
      const newConfig = await window.kanata.switchProfile(name);
      if (newConfig) {
        setConfig(newConfig);
        setActiveProfile(name);
        setActiveLayer(newConfig.layers[0]?.name || "base");
        setIsDirty(false);
        setSelectedKey(null);
        await refreshProfiles();
        return true;
      }
      return false;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to switch profile"));
      return false;
    }
  }, [isDirty, refreshProfiles, setConfig, setActiveProfile, setActiveLayer, setIsDirty, setSelectedKey, setError]);

  const deleteProfileAction = useCallback(async (name: string): Promise<boolean> => {
    if (!isElectron) {
      console.log("Would delete profile:", name);
      return true;
    }

    try {
      const success = await window.kanata.deleteProfile(name);
      if (success) {
        await refreshProfiles();
        // If we deleted the active profile, reload config
        if (name === activeProfile) {
          await loadConfig();
        }
      }
      return success;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to delete profile"));
      return false;
    }
  }, [activeProfile, loadConfig, refreshProfiles, setError]);

  const renameProfileAction = useCallback(async (oldName: string, newName: string): Promise<boolean> => {
    if (!isElectron) {
      console.log("Would rename profile:", oldName, "to", newName);
      return true;
    }

    try {
      const success = await window.kanata.renameProfile(oldName, newName);
      if (success) {
        await refreshProfiles();
      }
      return success;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to rename profile"));
      return false;
    }
  }, [refreshProfiles, setError]);

  const exportKbd = useCallback(async (): Promise<ExportResult> => {
    if (!isElectron) {
      console.log("Would export .kbd file");
      return { success: false, error: "Not running in Electron" };
    }

    try {
      return await window.kanata.exportKbd();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to export",
      };
    }
  }, []);

  const importKbd = useCallback(async (): Promise<ImportResult> => {
    if (!isElectron) {
      console.log("Would import .kbd file");
      return { success: false, error: "Not running in Electron" };
    }

    try {
      return await window.kanata.importKbd();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to import",
      };
    }
  }, []);

  const value = useMemo<ProfileContextValue>(() => ({
    createProfile,
    switchProfile,
    deleteProfile: deleteProfileAction,
    renameProfile: renameProfileAction,
    refreshProfiles,
    exportKbd,
    importKbd,
  }), [
    createProfile,
    switchProfile,
    deleteProfileAction,
    renameProfileAction,
    refreshProfiles,
    exportKbd,
    importKbd,
  ]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  assertContext(context, "useProfile", "ProfileProvider");
  return context;
}
