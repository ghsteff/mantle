import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { KeyboardConfig, KeyboardLayer, ProfileInfo } from "../types";
import { toErrorMessage, assertContext } from "../lib/errors";

// Public interface for components
interface ConfigContextValue {
  config: KeyboardConfig | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  // Profile state (read-only, managed by ProfileContext)
  profiles: ProfileInfo[];
  activeProfile: string | null;
  hasProfiles: boolean;
  // Layer operations
  updateKey: (layerName: string, keyId: string, action: string) => void;
  addLayer: (name: string) => void;
  removeLayer: (name: string, currentActiveLayer: string) => void;
  renameLayer: (oldName: string, newName: string, currentActiveLayer: string) => string;
  // Config operations
  applyChanges: (onSuccess?: () => Promise<void>) => Promise<boolean>;
  discardChanges: () => Promise<void>;
  reloadConfig: () => Promise<KeyboardConfig | null>;
}

// Internal interface for ProfileContext to use
interface ConfigInternalValue extends ConfigContextValue {
  setConfig: (config: KeyboardConfig | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setProfiles: (profiles: ProfileInfo[]) => void;
  setActiveProfile: (profile: string | null) => void;
  loadConfig: () => Promise<KeyboardConfig | null>;
}

const ConfigContext = createContext<ConfigInternalValue | null>(null);

// Check if we're running in Electron with the preload script
const isElectron = typeof window !== "undefined" && window.kanata !== undefined;

// Mock config for development outside Electron
const MOCK_CONFIG: KeyboardConfig = {
  sourceKeys: [
    "esc", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
    "grv", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "min", "eql", "bspc",
    "tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "lbrc", "rbrc", "bsls",
    "caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", "scln", "quot", "ret",
    "lsft", "z", "x", "c", "v", "b", "n", "m", "comm", "dot", "slsh", "rsft",
    "lctl", "lmet", "lalt", "spc", "ralt", "rmet", "rctl",
  ],
  layers: [
    {
      name: "base",
      keys: Object.fromEntries(
        ["esc", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
         "grv", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "min", "eql", "bspc",
         "tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "lbrc", "rbrc", "bsls",
         "caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", "scln", "quot", "ret",
         "lsft", "z", "x", "c", "v", "b", "n", "m", "comm", "dot", "slsh", "rsft",
         "lctl", "lmet", "lalt", "spc", "ralt", "rmet", "rctl"].map((k) => [k, k])
      ),
    },
    {
      name: "nav",
      keys: Object.fromEntries(
        ["esc", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
         "grv", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "min", "eql", "bspc",
         "tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "lbrc", "rbrc", "bsls",
         "caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", "scln", "quot", "ret",
         "lsft", "z", "x", "c", "v", "b", "n", "m", "comm", "dot", "slsh", "rsft",
         "lctl", "lmet", "lalt", "spc", "ralt", "rmet", "rctl"].map((k) => [k, "_"])
      ),
    },
  ],
};

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KeyboardConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Profile state (managed by ProfileContext but stored here for easy access)
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const hasProfiles = profiles.length > 0;

  // Load config from Electron or use mock
  const loadConfig = useCallback(async (): Promise<KeyboardConfig | null> => {
    setIsLoading(true);
    setError(null);
    try {
      let loadedConfig: KeyboardConfig | null;

      if (isElectron) {
        loadedConfig = await window.kanata.loadConfig();
      } else {
        // Use mock config for development outside Electron
        loadedConfig = MOCK_CONFIG;
      }

      if (loadedConfig) {
        setConfig(loadedConfig);
      }
      return loadedConfig;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to load config"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    setIsDirty(true);
  }, []);

  // Remove a layer - returns the new active layer name if the removed layer was active
  const removeLayer = useCallback(
    (name: string, currentActiveLayer: string) => {
      let newActiveLayer = currentActiveLayer;
      setConfig((prev) => {
        if (!prev) return prev;
        // Don't remove if only one layer
        if (prev.layers.length <= 1) return prev;
        const filtered = prev.layers.filter((l) => l.name !== name);
        // If removing active layer, switch to first remaining layer
        if (currentActiveLayer === name && filtered.length > 0) {
          newActiveLayer = filtered[0].name;
        }
        return { ...prev, layers: filtered };
      });
      setIsDirty(true);
      return newActiveLayer;
    },
    []
  );

  // Rename a layer - returns the new name if the renamed layer was active
  const renameLayer = useCallback((oldName: string, newName: string, currentActiveLayer: string): string => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map((layer) =>
          layer.name === oldName ? { ...layer, name: newName } : layer
        ),
      };
    });
    setIsDirty(true);
    return currentActiveLayer === oldName ? newName : currentActiveLayer;
  }, []);

  // Apply all pending changes - saves to disk and restarts Kanata
  const applyChanges = useCallback(async (onSuccess?: () => Promise<void>): Promise<boolean> => {
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
        if (onSuccess) {
          await onSuccess();
        }
      }
      return success;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to save config"));
      return false;
    }
  }, [config]);

  // Discard all pending changes - reload from disk
  const discardChanges = useCallback(async (): Promise<void> => {
    setIsDirty(false);
    await loadConfig();
  }, [loadConfig]);

  const value = useMemo<ConfigInternalValue>(() => ({
    config,
    isLoading,
    error,
    isDirty,
    profiles,
    activeProfile,
    hasProfiles,
    updateKey,
    addLayer,
    removeLayer,
    renameLayer,
    applyChanges,
    discardChanges,
    reloadConfig: loadConfig,
    // Internal setters
    setConfig,
    setIsLoading,
    setError,
    setIsDirty,
    setProfiles,
    setActiveProfile,
    loadConfig,
  }), [
    config,
    isLoading,
    error,
    isDirty,
    profiles,
    activeProfile,
    hasProfiles,
    updateKey,
    addLayer,
    removeLayer,
    renameLayer,
    applyChanges,
    discardChanges,
    loadConfig,
    setConfig,
    setIsLoading,
    setError,
    setIsDirty,
    setProfiles,
    setActiveProfile,
  ]);

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

// Public hook for components - returns only the public interface
export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  assertContext(context, "useConfig", "ConfigProvider");
  // Return only public properties
  const {
    config,
    isLoading,
    error,
    isDirty,
    profiles,
    activeProfile,
    hasProfiles,
    updateKey,
    addLayer,
    removeLayer,
    renameLayer,
    applyChanges,
    discardChanges,
    reloadConfig,
  } = context;

  return {
    config,
    isLoading,
    error,
    isDirty,
    profiles,
    activeProfile,
    hasProfiles,
    updateKey,
    addLayer,
    removeLayer,
    renameLayer,
    applyChanges,
    discardChanges,
    reloadConfig,
  };
}

// Internal hook for ProfileContext - returns full interface including setters
export function useConfigInternal(): ConfigInternalValue {
  const context = useContext(ConfigContext);
  assertContext(context, "useConfigInternal", "ConfigProvider");
  return context;
}
