import { useMemo } from "react";
import { Keyboard } from "lucide-react";
import { useConfigActions, useConfigState, useUIState } from "../../contexts";
import { ActionEditor } from "./action-editor";
import { cn } from "@/lib/utils";

export function KeyInspector() {
  const { config } = useConfigState();
  const { updateKey } = useConfigActions();
  const { selectedKey, activeLayer } = useUIState();

  const currentAction = useMemo(() => {
    if (!config || !selectedKey) return null;
    const layer = config.layers.find((l) => l.name === activeLayer);
    return layer?.keys[selectedKey] ?? selectedKey;
  }, [config, selectedKey, activeLayer]);

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
      <div className={cn(
        "w-72 border-l border-border p-6",
        "flex flex-col z-10",
        "bg-card/60 backdrop-blur-sm",
      )}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <Keyboard className="size-5 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] text-muted-foreground/70">Select a key to configure</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-72 border-l border-border p-5 overflow-y-auto z-10",
      "bg-card/60 backdrop-blur-sm",
      "animate-slide-in-right",
    )}>
      <ActionEditor
        keyId={selectedKey}
        currentAction={currentAction ?? selectedKey}
        onSave={handleSave}
        layers={layerNames}
      />
    </div>
  );
}
