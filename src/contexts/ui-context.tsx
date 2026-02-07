import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { assertContext } from "../lib/errors";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface UIState {
  selectedKey: string | null;
  activeLayer: string;
  showActions: boolean;
}

interface UIActions {
  setSelectedKey: (key: string | null) => void;
  setActiveLayer: (layerName: string) => void;
  setShowActions: (show: boolean) => void;
}

const UIStateContext = createContext<UIState | null>(null);
const UIActionsContext = createContext<UIActions | null>(null);

// LocalStorage key for showActions preference
const SHOW_ACTIONS_STORAGE_KEY = "mantle.showActions";

export function UIProvider({ children }: { children: ReactNode }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState("base");
  const [showActions, setShowActions] = useLocalStorage(
    SHOW_ACTIONS_STORAGE_KEY,
    false
  );

  const stateValue = useMemo<UIState>(
    () => ({
      selectedKey,
      activeLayer,
      showActions,
    }),
    [selectedKey, activeLayer, showActions]
  );

  const actionsValue = useMemo<UIActions>(
    () => ({
      setSelectedKey,
      setActiveLayer,
      setShowActions,
    }),
    [setSelectedKey, setActiveLayer, setShowActions]
  );

  return (
    <UIStateContext.Provider value={stateValue}>
      <UIActionsContext.Provider value={actionsValue}>
        {children}
      </UIActionsContext.Provider>
    </UIStateContext.Provider>
  );
}

export function useUIState(): UIState {
  const context = useContext(UIStateContext);
  assertContext(context, "useUIState", "UIProvider");
  return context;
}

export function useUIActions(): UIActions {
  const context = useContext(UIActionsContext);
  assertContext(context, "useUIActions", "UIProvider");
  return context;
}

export function useUI(): UIState & UIActions {
  const state = useUIState();
  const actions = useUIActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
