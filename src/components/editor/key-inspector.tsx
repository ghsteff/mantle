import { useMemo } from "react";
import { useConfig, useUI } from "../../contexts";
import { ActionEditor } from "./action-editor";

/**
 * Panel for inspecting and editing the selected key.
 */
export function KeyInspector() {
  const { config, updateKey } = useConfig();
  const { selectedKey, activeLayer } = useUI();

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
      <div className="w-72 bg-bg-secondary border-l border-border p-4 flex flex-col z-10">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-text-muted">
            <div className="text-4xl mb-2">⌨️</div>
            <div className="text-sm">Select a key to edit</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-bg-secondary border-l border-border p-4 overflow-y-auto z-10">
      <ActionEditor
        keyId={selectedKey}
        currentAction={currentAction || selectedKey}
        onSave={handleSave}
        layers={layerNames}
      />
    </div>
  );
}
