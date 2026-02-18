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
import { loadConfigFromRuntime } from "../platform/config-loader";
import { saveConfigToRuntime } from "../platform/config-saver";

// State values for components
interface ConfigState {
  config: KeyboardConfig | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  // Profile state (read-only, managed by ProfileContext)
  profiles: ProfileInfo[];
  activeProfile: string | null;
  hasProfiles: boolean;
}

// Public actions for components
interface ConfigActions {
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

// Internal actions for ProfileContext to use
interface ConfigInternalActions extends ConfigActions {
  setConfig: (config: KeyboardConfig | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setProfiles: (profiles: ProfileInfo[]) => void;
  setActiveProfile: (profile: string | null) => void;
  loadConfig: () => Promise<KeyboardConfig | null>;
}

const ConfigStateContext = createContext<ConfigState | null>(null);
const ConfigActionsContext = createContext<ConfigInternalActions | null>(null);

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
      const tauriConfig = await loadConfigFromRuntime();
      // Keep non-desktop and partial-tauri flows usable while migration is in progress.
      const loadedConfig = tauriConfig ?? MOCK_CONFIG;

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

    try {
      const success = await saveConfigToRuntime(config);
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

  const stateValue = useMemo<ConfigState>(
    () => ({
      config,
      isLoading,
      error,
      isDirty,
      profiles,
      activeProfile,
      hasProfiles,
    }),
    [config, isLoading, error, isDirty, profiles, activeProfile, hasProfiles]
  );

  const actionsValue = useMemo<ConfigInternalActions>(
    () => ({
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
    }),
    [
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
    ]
  );

  return (
    <ConfigStateContext.Provider value={stateValue}>
      <ConfigActionsContext.Provider value={actionsValue}>
        {children}
      </ConfigActionsContext.Provider>
    </ConfigStateContext.Provider>
  );
}

export function useConfigState(): ConfigState {
  const context = useContext(ConfigStateContext);
  assertContext(context, "useConfigState", "ConfigProvider");
  return context;
}

export function useConfigActions(): ConfigActions {
  const context = useContext(ConfigActionsContext);
  assertContext(context, "useConfigActions", "ConfigProvider");
  return useMemo(
    () => ({
      updateKey: context.updateKey,
      addLayer: context.addLayer,
      removeLayer: context.removeLayer,
      renameLayer: context.renameLayer,
      applyChanges: context.applyChanges,
      discardChanges: context.discardChanges,
      reloadConfig: context.reloadConfig,
    }),
    [context]
  );
}

export function useConfig(): ConfigState & ConfigActions {
  const state = useConfigState();
  const actions = useConfigActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

// Internal hook for ProfileContext - returns full action interface including setters
export function useConfigActionsInternal(): ConfigInternalActions {
  const context = useContext(ConfigActionsContext);
  assertContext(context, "useConfigActionsInternal", "ConfigProvider");
  return context;
}
