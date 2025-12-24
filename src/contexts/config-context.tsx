import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// Types matching preload.ts
interface KeyboardLayer {
  name: string;
  keys: Record<string, string>;
}

interface KeyboardConfig {
  sourceKeys: string[];
  layers: KeyboardLayer[];
  aliases?: Record<string, string>;
}

interface ConfigContextValue {
  config: KeyboardConfig | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  selectedKey: string | null;
  activeLayer: string;
  setSelectedKey: (key: string | null) => void;
  setActiveLayer: (layerName: string) => void;
  updateKey: (layerName: string, keyId: string, action: string) => void;
  addLayer: (name: string) => void;
  removeLayer: (name: string) => void;
  renameLayer: (oldName: string, newName: string) => void;
  applyChanges: () => Promise<boolean>;
  discardChanges: () => Promise<void>;
  reloadConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

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
      keys: Object.fromEntries([
        "esc", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
        "grv", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "min", "eql", "bspc",
        "tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "lbrc", "rbrc", "bsls",
        "caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", "scln", "quot", "ret",
        "lsft", "z", "x", "c", "v", "b", "n", "m", "comm", "dot", "slsh", "rsft",
        "lctl", "lmet", "lalt", "spc", "ralt", "rmet", "rctl",
      ].map((k) => [k, k])),
    },
    {
      name: "nav",
      keys: Object.fromEntries([
        "esc", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
        "grv", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "min", "eql", "bspc",
        "tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "lbrc", "rbrc", "bsls",
        "caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", "scln", "quot", "ret",
        "lsft", "z", "x", "c", "v", "b", "n", "m", "comm", "dot", "slsh", "rsft",
        "lctl", "lmet", "lalt", "spc", "ralt", "rmet", "rctl",
      ].map((k) => [k, "_"])),
    },
  ],
};

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KeyboardConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState("base");
  const [isDirty, setIsDirty] = useState(false);

  // Load config on mount
  const loadConfig = useCallback(async () => {
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
        // Set active layer to first layer if current doesn't exist
        if (!loadedConfig.layers.find((l) => l.name === activeLayer)) {
          setActiveLayer(loadedConfig.layers[0]?.name || "base");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setIsLoading(false);
    }
  }, [activeLayer]);

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
  const addLayer = useCallback(
    (name: string) => {
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
    },
    []
  );

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
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
      return false;
    }
  }, [config]);

  // Discard all pending changes - reload from disk
  const discardChanges = useCallback(async (): Promise<void> => {
    setIsDirty(false);
    await loadConfig();
  }, [loadConfig]);

  const value: ConfigContextValue = {
    config,
    isLoading,
    error,
    isDirty,
    selectedKey,
    activeLayer,
    setSelectedKey,
    setActiveLayer,
    updateKey,
    addLayer,
    removeLayer,
    renameLayer,
    applyChanges,
    discardChanges,
    reloadConfig: loadConfig,
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

