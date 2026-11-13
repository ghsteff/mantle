import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { KeyboardConfig, KeyboardLayer, ProfileInfo } from "../types";
import { toErrorMessage, assertContext } from "../lib/errors";
import { loadConfigFromRuntime } from "../platform/config-loader";
import { saveConfigToRuntime } from "../platform/config-saver";
import {
  aliasesReferencingLayer,
  defaultActionFor,
  referencesAlias,
  referencesLayer,
  renameLayerReferences,
  repairLegacyActions,
} from "../kanata/key-action";
import { useToast } from "./toast-context";

// State values for components
interface ConfigState {
  config: KeyboardConfig | null;
  loadState: "loading" | "ready" | "error";
  error: string | null;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  // Profile state (read-only, managed by ProfileContext)
  profiles: ProfileInfo[];
  activeProfile: string | null;
}

// Public actions for components
interface ConfigActions {
  // Layer operations
  updateKey: (layerName: string, keyId: string, action: string) => void;
  addLayer: (name: string) => void;
  removeLayer: (name: string) => void;
  renameLayer: (oldName: string, newName: string, currentActiveLayer: string) => string;
  // Config operations
  undo: () => void;
  redo: () => void;
  /** Number of steps that can currently be undone. */
  getUndoDepth: () => number;
  /** Undoes only if nothing else happened since the history was at `depth`. */
  undoFrom: (depth: number) => boolean;
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

interface HistoryEntry {
  config: KeyboardConfig;
  isDirty: boolean;
}

const MAX_HISTORY = 100;
// Edits to the same key this close together (e.g. dragging a slider) undo as one step.
const MERGE_EDITS_WITHIN_MS = 1000;

const ConfigStateContext = createContext<ConfigState | null>(null);
const ConfigActionsContext = createContext<ConfigInternalActions | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<KeyboardConfig | null>(null);
  const [loadState, setLoadState] = useState<ConfigState["loadState"]>("loading");
  const [error, setErrorState] = useState<string | null>(null);
  const [isDirty, setIsDirtyState] = useState(false);
  const { showToast } = useToast();

  // Profile state (managed by ProfileContext but stored here for easy access)
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  // Refs mirror the latest state so edits fired in quick succession build on each other.
  const configRef = useRef<KeyboardConfig | null>(null);
  const isDirtyRef = useRef(false);
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const lastEditRef = useRef<{ mergeKey: string; at: number } | null>(null);
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });

  const syncHistorySize = useCallback(() => {
    setHistorySize({ past: pastRef.current.length, future: futureRef.current.length });
  }, []);

  const showConfig = useCallback((next: KeyboardConfig | null, dirty: boolean) => {
    configRef.current = next;
    isDirtyRef.current = dirty;
    setConfigState(next);
    setIsDirtyState(dirty);
  }, []);

  const setIsDirty = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty;
    setIsDirtyState(dirty);
  }, []);

  // Replaces the config from outside the editor (load, profile switch), which starts a new history.
  const setConfig = useCallback(
    (next: KeyboardConfig | null) => {
      configRef.current = next;
      setConfigState(next);
      pastRef.current = [];
      futureRef.current = [];
      lastEditRef.current = null;
      syncHistorySize();
    },
    [syncHistorySize]
  );

  const edit = useCallback(
    (transform: (current: KeyboardConfig) => KeyboardConfig, mergeKey?: string) => {
      const current = configRef.current;
      if (!current) return;
      const next = transform(current);
      if (next === current) return;

      const now = Date.now();
      const last = lastEditRef.current;
      const mergesWithLast =
        mergeKey !== undefined &&
        last?.mergeKey === mergeKey &&
        now - last.at < MERGE_EDITS_WITHIN_MS &&
        pastRef.current.length > 0;
      if (!mergesWithLast) {
        pastRef.current = [
          ...pastRef.current,
          { config: current, isDirty: isDirtyRef.current },
        ].slice(-MAX_HISTORY);
      }
      futureRef.current = [];
      lastEditRef.current = mergeKey ? { mergeKey, at: now } : null;
      showConfig(next, true);
      syncHistorySize();
    },
    [showConfig, syncHistorySize]
  );

  const undo = useCallback(() => {
    const previous = pastRef.current[pastRef.current.length - 1];
    const current = configRef.current;
    if (!previous || !current) return;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, { config: current, isDirty: isDirtyRef.current }];
    lastEditRef.current = null;
    showConfig(previous.config, previous.isDirty);
    syncHistorySize();
  }, [showConfig, syncHistorySize]);

  const getUndoDepth = useCallback(() => pastRef.current.length, []);

  const undoFrom = useCallback(
    (depth: number) => {
      if (pastRef.current.length !== depth || futureRef.current.length > 0) return false;
      undo();
      return true;
    },
    [undo]
  );

  const redo = useCallback(() => {
    const next = futureRef.current[futureRef.current.length - 1];
    const current = configRef.current;
    if (!next || !current) return;
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, { config: current, isDirty: isDirtyRef.current }];
    lastEditRef.current = null;
    showConfig(next.config, next.isDirty);
    syncHistorySize();
  }, [showConfig, syncHistorySize]);

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
  }, [setConfig]);

  // Configs saved by older versions can hold actions Kanata rejects; fix them on sight.
  useEffect(() => {
    if (!config) return;
    const { config: repaired, repairedCount } = repairLegacyActions(config);
    if (repairedCount === 0) return;
    configRef.current = repaired;
    setConfigState(repaired);
    setIsDirty(true);
    showToast({
      tone: "info",
      title: `Updated ${repairedCount} ${repairedCount === 1 ? "key" : "keys"} for Kanata`,
      description: "One-shot layer keys were saved in a format Kanata can’t load. Apply to save the fix.",
    });
  }, [config, setIsDirty, showToast]);

  const updateKey = useCallback(
    (layerName: string, keyId: string, action: string) => {
      edit(
        (prev) => ({
          ...prev,
          // Kanata only remaps keys listed in defsrc, which is built from sourceKeys.
          sourceKeys: prev.sourceKeys.includes(keyId)
            ? prev.sourceKeys
            : [...prev.sourceKeys, keyId],
          layers: prev.layers.map((layer) =>
            layer.name === layerName
              ? { ...layer, keys: { ...layer.keys, [keyId]: action } }
              : layer
          ),
        }),
        `key:${layerName}:${keyId}`
      );
    },
    [edit]
  );

  const addLayer = useCallback(
    (name: string) => {
      edit((prev) => {
        if (prev.layers.find((l) => l.name === name)) return prev;
        const newLayer: KeyboardLayer = {
          name,
          keys: Object.fromEntries(prev.sourceKeys.map((k) => [k, "_"])),
        };
        return { ...prev, layers: [...prev.layers, newLayer] };
      });
    },
    [edit]
  );

  // Keys that switch to a removed layer are reset so the config stays valid.
  const removeLayer = useCallback(
    (name: string) => {
      edit((prev) => {
        if (prev.layers.length <= 1) return prev;
        const staleAliases = aliasesReferencingLayer(prev.aliases, name);
        const layers = prev.layers
          .filter((l) => l.name !== name)
          .map((layer, index) => ({
            ...layer,
            keys: Object.fromEntries(
              Object.entries(layer.keys).map(([keyId, action]) => [
                keyId,
                referencesLayer(action, name) || referencesAlias(action, staleAliases)
                  ? defaultActionFor(keyId, index === 0)
                  : action,
              ])
            ),
          }));
        const aliases = prev.aliases
          ? Object.fromEntries(
              Object.entries(prev.aliases).filter(([alias]) => !staleAliases.includes(alias))
            )
          : prev.aliases;
        return { ...prev, aliases, layers };
      });
    },
    [edit]
  );

  // Renames the layer and every key action that switches to it.
  const renameLayer = useCallback(
    (oldName: string, newName: string, currentActiveLayer: string): string => {
      edit((prev) => ({
        ...prev,
        aliases: prev.aliases
          ? Object.fromEntries(
              Object.entries(prev.aliases).map(([alias, action]) => [
                alias,
                renameLayerReferences(action, oldName, newName),
              ])
            )
          : prev.aliases,
        layers: prev.layers.map((layer) => ({
          name: layer.name === oldName ? newName : layer.name,
          keys: Object.fromEntries(
            Object.entries(layer.keys).map(([keyId, action]) => [
              keyId,
              renameLayerReferences(action, oldName, newName),
            ])
          ),
        })),
      }));
      return currentActiveLayer === oldName ? newName : currentActiveLayer;
    },
    [edit]
  );

  // Apply all pending changes - saves to disk and restarts Kanata
  const applyChanges = useCallback(async (onSuccess?: () => Promise<void>): Promise<boolean> => {
    const current = configRef.current;
    if (!current) return false;

    try {
      const success = await saveConfigToRuntime(current);
      if (success) {
        // History entries are now dirty unless they are exactly what was saved.
        const markSaved = (entry: HistoryEntry) => ({ ...entry, isDirty: entry.config !== current });
        pastRef.current = pastRef.current.map(markSaved);
        futureRef.current = futureRef.current.map(markSaved);
        lastEditRef.current = null;
        setIsDirty(configRef.current !== current);
        if (onSuccess) {
          await onSuccess();
        }
      }
      return success;
    } catch (err) {
      console.error("Failed to save config:", toErrorMessage(err, "unknown error"));
      return false;
    }
  }, [setIsDirty]);

  // Reloads the saved config; the discarded edits stay one undo away.
  const discardChanges = useCallback(async (): Promise<void> => {
    const discarded = configRef.current;
    const wasDirty = isDirtyRef.current;
    const reloaded = await loadConfig();
    if (!reloaded) return;
    setIsDirty(false);
    if (discarded) {
      pastRef.current = [{ config: discarded, isDirty: wasDirty }];
      syncHistorySize();
    }
  }, [loadConfig, setIsDirty, syncHistorySize]);

  const stateValue = useMemo<ConfigState>(
    () => ({
      config,
      loadState,
      error,
      isDirty,
      canUndo: historySize.past > 0,
      canRedo: historySize.future > 0,
      profiles,
      activeProfile,
    }),
    [config, loadState, error, isDirty, historySize, profiles, activeProfile]
  );

  const actionsValue = useMemo<ConfigInternalActions>(
    () => ({
      updateKey,
      addLayer,
      removeLayer,
      renameLayer,
      undo,
      redo,
      getUndoDepth,
      undoFrom,
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
      undo,
      redo,
      getUndoDepth,
      undoFrom,
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
      undo: context.undo,
      redo: context.redo,
      getUndoDepth: context.getUndoDepth,
      undoFrom: context.undoFrom,
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
