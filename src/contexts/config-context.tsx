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
  loadState: "loading" | "ready" | "error";
  error: string | null;
  isDirty: boolean;
  // Profile state (read-only, managed by ProfileContext)
  profiles: ProfileInfo[];
  activeProfile: string | null;
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

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KeyboardConfig | null>(null);
  const [loadState, setLoadState] = useState<ConfigState["loadState"]>("loading");
  const [error, setErrorState] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Profile state (managed by ProfileContext but stored here for easy access)
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  const setIsLoading = useCallback((loading: boolean) => {
    setLoadState((prev) => {
      if (loading) {
        return "loading";
      }
      return prev === "error" ? prev : "ready";
    });
  }, []);

  const setError = useCallback((nextError: string | null) => {
    setErrorState(nextError);
    setLoadState(nextError ? "error" : "ready");
  }, []);

  const loadConfig = useCallback(async (): Promise<KeyboardConfig | null> => {
    setLoadState("loading");
    setErrorState(null);
    try {
      const loadedConfig = await loadConfigFromRuntime();
      if (!loadedConfig) {
        // No config yet (e.g. first run before profile creation) — not an error
        setLoadState("ready");
        return null;
      }

      setConfig(loadedConfig);
      setLoadState("ready");
      return loadedConfig;
    } catch (err) {
      setLoadState("error");
      setErrorState(toErrorMessage(err, "Failed to load config"));
      return null;
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
      loadState,
      error,
      isDirty,
      profiles,
      activeProfile,
    }),
    [config, loadState, error, isDirty, profiles, activeProfile]
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
