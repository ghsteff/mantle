import { useCallback, useMemo } from "react";
import { Key } from "./key";
import {
  TKL_LAYOUT,
  getLayoutWidth,
  getLayoutHeight,
  type KeyDef,
} from "../utils/layout";
import {
  useConfigState,
  useUIActions,
  useUIState,
} from "../../../contexts";
import { Switch } from "../../ui";
import { cn } from "@/lib/utils";

interface KeyboardGridProps {
  layout?: KeyDef[];
}

export function KeyboardGrid({ layout = TKL_LAYOUT }: KeyboardGridProps) {
  const { config } = useConfigState();
  const { selectedKey, activeLayer, showActions } = useUIState();
  const { setSelectedKey, setShowActions } = useUIActions();

  const layerKeys = useMemo(() => {
    if (!config) return {};
    const layer = config.layers.find((l) => l.name === activeLayer);
    return layer?.keys || {};
  }, [config, activeLayer]);

  const layoutWidth = getLayoutWidth(layout);
  const layoutHeight = getLayoutHeight(layout);
  const unitSize = 48;
  const gridWidth = layoutWidth * unitSize;
  const gridHeight = layoutHeight * unitSize;

  const handleSelectKey = useCallback(
    (keyId: string) => {
      setSelectedKey((current) => (current === keyId ? null : keyId));
    },
    [setSelectedKey]
  );

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-auto relative ambient-bg">
      {/* View mode toggle — floating pill */}
      <div className={cn(
        "absolute top-5 right-5 z-10",
        "flex items-center gap-2.5 px-3.5 py-2",
        "glass rounded-full",
        "animate-fade-in",
      )}>
        <span className={cn(
          "text-[11px] font-medium tracking-wide transition-colors duration-150",
          !showActions ? "text-foreground" : "text-muted-foreground",
        )}>Keys</span>
        <Switch checked={showActions} onCheckedChange={setShowActions} />
        <span className={cn(
          "text-[11px] font-medium tracking-wide transition-colors duration-150",
          showActions ? "text-foreground" : "text-muted-foreground",
        )}>Actions</span>
      </div>

      <div
        className="relative"
        style={{
          width: `${gridWidth}px`,
          height: `${gridHeight}px`,
          minWidth: `${gridWidth}px`,
          minHeight: `${gridHeight}px`,
        }}
      >
        {layout.map((keyDef) => {
          if (keyDef.isSpacer) return null;

          const action = layerKeys[keyDef.id] || keyDef.id;
          const isSelected = selectedKey === keyDef.id;

          return (
            <Key
              key={keyDef.id}
              keyId={keyDef.id}
              keyDef={keyDef}
              action={action}
              isSelected={isSelected}
              onSelect={handleSelectKey}
              unitSize={unitSize}
              showAction={showActions}
            />
          );
        })}
      </div>
    </div>
  );
}
