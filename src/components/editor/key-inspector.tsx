import { useMemo } from "react";
import { Keyboard } from "lucide-react";
import { useConfigActions, useConfigState, useUIState } from "../../contexts";
import { ActionEditor } from "./action-editor";

/**
 * Panel for inspecting and editing the selected key.
 */
export function KeyInspector() {
  const { config } = useConfigState();
  const { updateKey } = useConfigActions();
  const { selectedKey, activeLayer } = useUIState();

  // Get the current action for the selected key
  const currentAction = useMemo(() => {
    if (!config || !selectedKey) return null;
    const layer = config.layers.find((l) => l.name === activeLayer);
    return layer?.keys[selectedKey] || selectedKey;
  }, [config, selectedKey, activeLayer]);

  // Get layer names for the layer selector
  const layerNames = useMemo(() => {
    return config?.layers.map((l) => l.name) || [];
  }, [config]);

  const handleSave = (action: string) => {
    if (selectedKey) {
      updateKey(activeLayer, selectedKey, action);
    }
  };

  if (!selectedKey) {
    return (
      <div className="w-72 bg-card border-l border-border p-4 flex flex-col z-10 transition-all duration-200">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center text-muted-foreground">
            <Keyboard className="size-8 text-muted-foreground/40 mb-3 mx-auto" strokeWidth={1} />
            <p className="text-sm text-muted-foreground">Click a key to configure</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-card border-l border-border p-4 overflow-y-auto z-10 transition-all duration-200">
      <ActionEditor
        keyId={selectedKey}
        currentAction={currentAction || selectedKey}
        onSave={handleSave}
        layers={layerNames}
      />
    </div>
  );
}
