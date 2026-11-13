import { useEffect, useMemo, useState } from "react";
import { RotateCcwIcon, X } from "lucide-react";
import {
  useConfigActions,
  useConfigState,
  useUIActions,
  useUIState,
} from "../../contexts";
import { ActionEditor } from "./action-editor";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "../ui";
import { cn } from "@/lib/utils";
import { getKeyLabel, getKeyName } from "../keyboard/utils/layout";
import { describeAction } from "../keyboard/utils/format-action";
import { TRANSPARENT, defaultActionFor } from "@/kanata/key-action";
import type { KeyboardLayer } from "@/types";

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

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

  const layers = useMemo(() => config?.layers ?? [], [config]);
  const isBaseLayer = layers[0]?.name === activeLayer;

  const currentAction = useMemo(() => {
    if (!displayedKey) return null;
    const layer = layers.find((l) => l.name === activeLayer);
    return layer?.keys[displayedKey] ?? defaultActionFor(displayedKey, isBaseLayer);
  }, [layers, displayedKey, activeLayer, isBaseLayer]);

  const handleSave = (action: string) => {
    if (displayedKey) {
      updateKey(activeLayer, displayedKey, action);
    }
  };

  return (
    <aside
      aria-label={displayedKey ? `Edit ${getKeyName(displayedKey)}` : undefined}
      aria-hidden={!selectedKey}
      inert={!selectedKey}
      className={cn(
        "fixed top-11 right-0 bottom-9 z-30 w-80 border-l border-border bg-card/95 shadow-lg backdrop-blur-sm",
        "transition-transform duration-300 ease-out",
        selectedKey ? "translate-x-0" : "translate-x-full pointer-events-none"
      )}
    >
      {displayedKey && currentAction !== null && (
        <KeyInspectorContent
          keyId={displayedKey}
          currentAction={currentAction}
          activeLayer={activeLayer}
          isBaseLayer={isBaseLayer}
          layers={layers}
          onSave={handleSave}
          onReset={(action) => updateKey(activeLayer, displayedKey, action)}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </aside>
  );
}

interface KeyInspectorContentProps {
  keyId: string;
  currentAction: string;
  activeLayer: string;
  isBaseLayer: boolean;
  layers: KeyboardLayer[];
  onSave: (action: string) => void;
  onReset: (action: string) => void;
  onClose: () => void;
}

function KeyInspectorContent({
  keyId,
  currentAction,
  activeLayer,
  isBaseLayer,
  layers,
  onSave,
  onReset,
  onClose,
}: KeyInspectorContentProps) {
  const defaultAction = defaultActionFor(keyId, isBaseLayer);
  const baseAction = layers[0]?.keys[keyId] ?? keyId;
  const isChanged = currentAction !== defaultAction;
  const keyLabel = getKeyLabel(keyId).label;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border-subtle px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-key border border-key-border bg-key-bg font-mono text-foreground shadow-key",
              keyLabel.length <= 2 ? "text-sm" : "text-[9px]",
            )}
          >
            {keyLabel}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {getKeyName(keyId)}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              on the <span className="font-mono text-foreground/80">{activeLayer}</span> layer
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {isChanged && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onReset(defaultAction)}
                    aria-label="Reset key"
                  >
                    <RotateCcwIcon className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isBaseLayer ? "Reset to the original key" : "Reset to pass through to the base layer"}
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="Close key editor"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
        <p className="mt-3 rounded-md bg-muted/50 px-2.5 py-2 text-[11px] leading-relaxed text-foreground/80">
          {currentAction === TRANSPARENT
            ? `Same as the base layer: ${lowerFirst(describeAction(baseAction))}`
            : describeAction(currentAction)}
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        <ActionEditor
          keyId={keyId}
          currentAction={currentAction}
          onSave={onSave}
          layers={layers}
          activeLayer={activeLayer}
        />
      </div>
    </div>
  );
}
