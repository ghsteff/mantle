import { useMemo } from "react";
import { Key } from "./key";
import {
  TKL_LAYOUT,
  getLayoutWidth,
  getLayoutHeight,
  type KeyDef,
} from "../utils/layout";
import { useConfig } from "../../../contexts";
import { Switch } from "../../ui";

interface KeyboardGridProps {
  layout?: KeyDef[];
}

/**
 * Renders the full keyboard grid.
 */
export function KeyboardGrid({ layout = TKL_LAYOUT }: KeyboardGridProps) {
  const {
    config,
    selectedKey,
    activeLayer,
    setSelectedKey,
    showActions,
    setShowActions,
  } = useConfig();

  // Get the current layer's key mappings
  const layerKeys = useMemo(() => {
    if (!config) return {};
    const layer = config.layers.find((l) => l.name === activeLayer);
    return layer?.keys || {};
  }, [config, activeLayer]);

  // Calculate dimensions
  const layoutWidth = getLayoutWidth(layout);
  const layoutHeight = getLayoutHeight(layout);

  // Calculate unit size to fit the container
  // We use a base of 48px per unit, but this can be scaled
  const unitSize = 48;

  const gridWidth = layoutWidth * unitSize;
  const gridHeight = layoutHeight * unitSize;

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative">
      {/* View mode toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-bg-secondary border border-border px-3 py-1.5 z-10">
        <span className="text-xs text-text-muted">Keys</span>
        <Switch checked={showActions} onCheckedChange={setShowActions} />
        <span className="text-xs text-text-muted">Actions</span>
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
              keyDef={keyDef}
              action={action}
              isSelected={isSelected}
              onClick={() => setSelectedKey(isSelected ? null : keyDef.id)}
              unitSize={unitSize}
              showAction={showActions}
            />
          );
        })}
      </div>
    </div>
  );
}
