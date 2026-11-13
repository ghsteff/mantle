import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { assertContext } from "../lib/errors";

interface UIState {
  selectedKey: string | null;
  activeLayer: string;
}

interface UIActions {
  setSelectedKey: (key: string | null) => void;
  setActiveLayer: (layerName: string) => void;
}

const UIStateContext = createContext<UIState | null>(null);
const UIActionsContext = createContext<UIActions | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState("base");

  const stateValue = useMemo<UIState>(
    () => ({
      selectedKey,
      activeLayer,
    }),
    [selectedKey, activeLayer]
  );

  const actionsValue = useMemo<UIActions>(
    () => ({
      setSelectedKey,
      setActiveLayer,
    }),
    [setSelectedKey, setActiveLayer]
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
