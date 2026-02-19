import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  useConfigActions,
  useConfigState,
  useUIActions,
  useUIState,
} from "../../contexts";
import { ActionEditor } from "./action-editor";
import {
  Button,
  DrawerHeader,
} from "../ui";
import { cn } from "@/lib/utils";
import { getKeyLabel } from "../keyboard/utils/layout";

export function KeyInspector() {
  const { config } = useConfigState();
  const { updateKey } = useConfigActions();
  const { setSelectedKey } = useUIActions();
  const { selectedKey, activeLayer } = useUIState();
  const [displayedKey, setDisplayedKey] = useState<string | null>(selectedKey);

  useEffect(() => {
    if (selectedKey) {
      setDisplayedKey(selectedKey);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDisplayedKey(null);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedKey]);

  const currentAction = useMemo(() => {
    if (!config || !displayedKey) return null;
    const layer = config.layers.find((l) => l.name === activeLayer);
    return layer?.keys[displayedKey] ?? displayedKey;
  }, [config, displayedKey, activeLayer]);

  const layerNames = useMemo(() => {
    return config?.layers.map((l) => l.name) || [];
  }, [config]);

  const handleSave = (action: string) => {
    if (displayedKey) {
      updateKey(activeLayer, displayedKey, action);
    }
  };

  const selectedKeyLabel = displayedKey ? getKeyLabel(displayedKey).label : "";

  return (
    <aside
      className={cn(
        "fixed top-12 right-0 bottom-9 z-50 w-80 border-l border-border bg-card/95 shadow-lg backdrop-blur-sm",
        "transition-transform duration-300 ease-out",
        selectedKey ? "translate-x-0" : "translate-x-full pointer-events-none"
      )}
      aria-hidden={!selectedKey}
    >
      {displayedKey && (
        <div className="flex h-full flex-col">
          <DrawerHeader className="border-b border-border-subtle px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Edit
                </p>
                <h2 className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-base font-semibold text-foreground">
                    {selectedKeyLabel}
                  </span>
                  <span className="font-mono text-[11px] uppercase text-muted-foreground/60">
                    {displayedKey}
                  </span>
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedKey(null)}
              >
                <X className="size-3.5" />
                <span className="sr-only">Close key editor</span>
              </Button>
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-5">
            <ActionEditor
              keyId={displayedKey}
              currentAction={currentAction ?? displayedKey}
              onSave={handleSave}
              layers={layerNames}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
