import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { assertContext } from "../lib/errors";

interface UIContextValue {
  selectedKey: string | null;
  activeLayer: string;
  showActions: boolean;
  setSelectedKey: (key: string | null) => void;
  setActiveLayer: (layerName: string) => void;
  setShowActions: (show: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

// LocalStorage key for showActions preference
const SHOW_ACTIONS_STORAGE_KEY = "mantle.showActions";

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

export function UIProvider({ children }: { children: ReactNode }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState("base");
  const [showActions, setShowActions] = useState(loadShowActionsPreference);

  // Persist showActions to localStorage whenever it changes
  useEffect(() => {
    saveShowActionsPreference(showActions);
  }, [showActions]);

  const value = useMemo<UIContextValue>(() => ({
    selectedKey,
    activeLayer,
    showActions,
    setSelectedKey,
    setActiveLayer,
    setShowActions,
  }), [
    selectedKey,
    activeLayer,
    showActions,
    setSelectedKey,
    setActiveLayer,
    setShowActions,
  ]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  assertContext(context, "useUI", "UIProvider");
  return context;
}
