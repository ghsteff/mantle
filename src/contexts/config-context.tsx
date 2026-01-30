import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  KeyboardLayer,
  KeyboardConfig,
  ProfileInfo,
  ExportResult,
  ImportResult,
} from "../types";

interface ConfigContextValue {
  config: KeyboardConfig | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  selectedKey: string | null;
  activeLayer: string;
  showActions: boolean;
  // Profile management
  profiles: ProfileInfo[];
  activeProfile: string | null;
  hasProfiles: boolean;
  // Actions
  setSelectedKey: (key: string | null) => void;
  setActiveLayer: (layerName: string) => void;
  setShowActions: (show: boolean) => void;
  updateKey: (layerName: string, keyId: string, action: string) => void;
  addLayer: (name: string) => void;
  removeLayer: (name: string) => void;
  renameLayer: (oldName: string, newName: string) => void;
  applyChanges: () => Promise<boolean>;
  discardChanges: () => Promise<void>;
  reloadConfig: () => Promise<void>;
  // Profile actions
  createProfile: (name: string, config: KeyboardConfig) => Promise<boolean>;
  switchProfile: (name: string) => Promise<boolean>;
  deleteProfile: (name: string) => Promise<boolean>;
  renameProfile: (oldName: string, newName: string) => Promise<boolean>;
  refreshProfiles: () => Promise<void>;
  // Import/Export
  exportKbd: () => Promise<ExportResult>;
  importKbd: () => Promise<ImportResult>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

// Check if we're running in Electron with the preload script
const isElectron = typeof window !== "undefined" && window.kanata !== undefined;

// LocalStorage key for showActions preference
const SHOW_ACTIONS_STORAGE_KEY = "kanata-ui.showActions";

// Load showActions preference from localStorage
function loadShowActionsPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(SHOW_ACTIONS_STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

// Save showActions preference to localStorage
function saveShowActionsPreference(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHOW_ACTIONS_STORAGE_KEY, String(value));
  } catch {
    // Ignore localStorage errors
  }
}

// Mock config for development outside Electron
const MOCK_CONFIG: KeyboardConfig = {
  sourceKeys: [
    "esc",
    "f1",
    "f2",
    "f3",
    "f4",
    "f5",
    "f6",
    "f7",
    "f8",
    "f9",
    "f10",
    "f11",
    "f12",
    "grv",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "0",
    "min",
    "eql",
    "bspc",
    "tab",
    "q",
    "w",
    "e",
    "r",
    "t",
    "y",
    "u",
    "i",
    "o",
    "p",
    "lbrc",
    "rbrc",
    "bsls",
    "caps",
    "a",
    "s",
    "d",
    "f",
    "g",
    "h",
    "j",
    "k",
    "l",
    "scln",
    "quot",
    "ret",
    "lsft",
    "z",
    "x",
    "c",
    "v",
    "b",
    "n",
    "m",
    "comm",
    "dot",
    "slsh",
    "rsft",
    "lctl",
    "lmet",
    "lalt",
    "spc",
    "ralt",
    "rmet",
    "rctl",
  ],
  layers: [
    {
      name: "base",
      keys: Object.fromEntries(
        [
          "esc",
          "f1",
          "f2",
          "f3",
          "f4",
          "f5",
          "f6",
          "f7",
          "f8",
          "f9",
          "f10",
          "f11",
          "f12",
          "grv",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "0",
          "min",
          "eql",
          "bspc",
          "tab",
          "q",
          "w",
          "e",
          "r",
          "t",
          "y",
          "u",
          "i",
          "o",
          "p",
          "lbrc",
          "rbrc",
          "bsls",
          "caps",
          "a",
          "s",
          "d",
          "f",
          "g",
          "h",
          "j",
          "k",
          "l",
          "scln",
          "quot",
          "ret",
          "lsft",
          "z",
          "x",
          "c",
          "v",
          "b",
          "n",
          "m",
          "comm",
          "dot",
          "slsh",
          "rsft",
          "lctl",
          "lmet",
          "lalt",
          "spc",
          "ralt",
          "rmet",
          "rctl",
        ].map((k) => [k, k])
      ),
    },
    {
      name: "nav",
      keys: Object.fromEntries(
        [
          "esc",
          "f1",
          "f2",
          "f3",
          "f4",
          "f5",
          "f6",
          "f7",
          "f8",
          "f9",
          "f10",
          "f11",
          "f12",
          "grv",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "0",
          "min",
          "eql",
          "bspc",
          "tab",
          "q",
          "w",
          "e",
          "r",
          "t",
          "y",
          "u",
          "i",
          "o",
          "p",
          "lbrc",
          "rbrc",
          "bsls",
          "caps",
          "a",
          "s",
          "d",
          "f",
          "g",
          "h",
          "j",
          "k",
          "l",
          "scln",
          "quot",
          "ret",
          "lsft",
          "z",
          "x",
          "c",
          "v",
          "b",
          "n",
          "m",
          "comm",
          "dot",
          "slsh",
          "rsft",
          "lctl",
          "lmet",
          "lalt",
          "spc",
          "ralt",
          "rmet",
          "rctl",
        ].map((k) => [k, "_"])
      ),
    },
  ],
};

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KeyboardConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState("base");
  const [showActions, setShowActions] = useState(loadShowActionsPreference);
  const [isDirty, setIsDirty] = useState(false);
  
  // Profile state
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [hasProfiles, setHasProfiles] = useState(false);

  // Persist showActions to localStorage whenever it changes
  useEffect(() => {
    saveShowActionsPreference(showActions);
  }, [showActions]);

  // Load profiles list
  const refreshProfiles = useCallback(async () => {
    if (!isElectron) {
      // Mock data for development
      setProfiles([{ name: "default", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
      setActiveProfile("default");
      setHasProfiles(true);
      return;
    }
    
    try {
      const [profilesList, active, has] = await Promise.all([
        window.kanata.listProfiles(),
        window.kanata.getActiveProfile(),
        window.kanata.hasProfiles(),
      ]);
      setProfiles(profilesList);
      setActiveProfile(active);
      setHasProfiles(has);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    }
  }, []);

  // Load config on mount
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First refresh profiles
      await refreshProfiles();
      
      let loadedConfig: KeyboardConfig | null;

      if (isElectron) {
        loadedConfig = await window.kanata.loadConfig();
      } else {
        // Use mock config for development outside Electron
        loadedConfig = MOCK_CONFIG;
      }

      if (loadedConfig) {
        setConfig(loadedConfig);
        // Set active layer to first layer
        setActiveLayer((current) => {
          if (!loadedConfig.layers.find((l) => l.name === current)) {
            return loadedConfig.layers[0]?.name || "base";
          }
          return current;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setIsLoading(false);
    }
  }, [refreshProfiles]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Update a key in a specific layer
  const updateKey = useCallback(
    (layerName: string, keyId: string, action: string) => {
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          layers: prev.layers.map((layer) =>
            layer.name === layerName
              ? { ...layer, keys: { ...layer.keys, [keyId]: action } }
              : layer
          ),
        };
      });
      setIsDirty(true);
    },
    []
  );

  // Add a new layer
  const addLayer = useCallback((name: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      // Don't add duplicate
      if (prev.layers.find((l) => l.name === name)) return prev;
      // Create transparent layer
      const newLayer: KeyboardLayer = {
        name,
        keys: Object.fromEntries(prev.sourceKeys.map((k) => [k, "_"])),
      };
      return { ...prev, layers: [...prev.layers, newLayer] };
    });
    setActiveLayer(name);
    setIsDirty(true);
  }, []);

  // Remove a layer
  const removeLayer = useCallback(
    (name: string) => {
      setConfig((prev) => {
        if (!prev) return prev;
        // Don't remove if only one layer
        if (prev.layers.length <= 1) return prev;
        const filtered = prev.layers.filter((l) => l.name !== name);
        return { ...prev, layers: filtered };
      });
      // Switch to another layer if removing active
      if (activeLayer === name) {
        setConfig((prev) => {
          if (prev && prev.layers.length > 0) {
            setActiveLayer(prev.layers[0].name);
          }
          return prev;
        });
      }
      setIsDirty(true);
    },
    [activeLayer]
  );

  // Rename a layer
  const renameLayer = useCallback((oldName: string, newName: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map((layer) =>
          layer.name === oldName ? { ...layer, name: newName } : layer
        ),
      };
    });
    setActiveLayer((current) => (current === oldName ? newName : current));
    setIsDirty(true);
  }, []);

  // Apply all pending changes - saves to disk and restarts Kanata
  const applyChanges = useCallback(async (): Promise<boolean> => {
    if (!config) return false;

    if (!isElectron) {
      // In dev mode without Electron, just log
      console.log("Config would be saved:", config);
      setIsDirty(false);
      return true;
    }

    try {
      const success = await window.kanata.saveConfig(config);
      if (success) {
        setIsDirty(false);
        await refreshProfiles(); // Refresh to get updated timestamps
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
      return false;
    }
  }, [config, refreshProfiles]);

  // Discard all pending changes - reload from disk
  const discardChanges = useCallback(async (): Promise<void> => {
    setIsDirty(false);
    await loadConfig();
  }, [loadConfig]);

  // ============================================
  // Profile Management
  // ============================================

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
      setError(err instanceof Error ? err.message : "Failed to create profile");
      return false;
    }
  }, [refreshProfiles]);

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
      setError(err instanceof Error ? err.message : "Failed to switch profile");
      return false;
    }
  }, [isDirty, refreshProfiles]);

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
      setError(err instanceof Error ? err.message : "Failed to delete profile");
      return false;
    }
  }, [activeProfile, loadConfig, refreshProfiles]);

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
      setError(err instanceof Error ? err.message : "Failed to rename profile");
      return false;
    }
  }, [refreshProfiles]);

  // ============================================
  // Import/Export
  // ============================================

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

  const value: ConfigContextValue = {
    config,
    isLoading,
    error,
    isDirty,
    selectedKey,
    activeLayer,
    showActions,
    profiles,
    activeProfile,
    hasProfiles,
    setSelectedKey,
    setActiveLayer,
    setShowActions,
    updateKey,
    addLayer,
    removeLayer,
    renameLayer,
    applyChanges,
    discardChanges,
    reloadConfig: loadConfig,
    createProfile,
    switchProfile,
    deleteProfile: deleteProfileAction,
    renameProfile: renameProfileAction,
    refreshProfiles,
    exportKbd,
    importKbd,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
}
