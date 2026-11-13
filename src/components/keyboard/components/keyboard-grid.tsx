import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Key } from "./key";
import {
  KEYBOARD_LAYOUTS,
  getKeyName,
  getLayoutWidth,
  getLayoutHeight,
  type KeyDef,
  type KeyboardLayoutId,
} from "../utils/layout";
import {
  useConfigState,
  useUIActions,
  useUIState,
} from "../../../contexts";
import { defaultActionFor } from "@/kanata/key-action";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui";

const LAYOUT_STORAGE_KEY = "mantle.keyboardLayout";

const ARROW_DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

/** The nearest key in the arrow's direction, favoring keys in line with the current one. */
function neighborKey(layout: KeyDef[], fromId: string, direction: { dx: number; dy: number }) {
  const center = (keyDef: KeyDef) => ({
    x: keyDef.col + keyDef.width / 2,
    y: keyDef.row + (keyDef.height ?? 1) / 2,
  });
  const from = layout.find((keyDef) => keyDef.id === fromId);
  if (!from) return null;
  const origin = center(from);

  let best: { id: string; score: number } | null = null;
  for (const keyDef of layout) {
    if (keyDef.isSpacer || keyDef.id === fromId) continue;
    const point = center(keyDef);
    const along = (point.x - origin.x) * direction.dx + (point.y - origin.y) * direction.dy;
    if (along <= 0.1) continue;
    const across = Math.abs((point.x - origin.x) * direction.dy + (point.y - origin.y) * direction.dx);
    const score = along + across * 3;
    if (!best || score < best.score) best = { id: keyDef.id, score };
  }
  return best?.id ?? null;
}

export function KeyboardGrid() {
  const { config } = useConfigState();
  const [layoutId, setLayoutId] = useLocalStorage<KeyboardLayoutId>(LAYOUT_STORAGE_KEY, "tkl");
  const layout = (KEYBOARD_LAYOUTS.find((option) => option.id === layoutId) ?? KEYBOARD_LAYOUTS[1]).keys;
  const { selectedKey, activeLayer } = useUIState();
  const { setSelectedKey } = useUIActions();
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const layerKeys = useMemo(() => {
    if (!config) return {};
    const layer = config.layers.find((l) => l.name === activeLayer);
    return layer?.keys || {};
  }, [config, activeLayer]);

  const baseKeys = config?.layers[0]?.keys ?? {};
  const isBaseLayer = config?.layers[0]?.name === activeLayer;

  const hiddenRemappedKeys = useMemo(() => {
    const shown = new Set(layout.map((keyDef) => keyDef.id));
    return Object.entries(layerKeys)
      .filter(([keyId, action]) => !shown.has(keyId) && action !== defaultActionFor(keyId, isBaseLayer))
      .map(([keyId]) => keyId);
  }, [layout, layerKeys, isBaseLayer]);

  const hasRemaps = useMemo(
    () =>
      config?.layers.some((layer, index) =>
        Object.entries(layer.keys).some(([keyId, action]) => action !== defaultActionFor(keyId, index === 0))
      ) ?? false,
    [config]
  );

  const tabStopKey =
    [selectedKey, focusedKey].find((id) => id && layout.some((keyDef) => keyDef.id === id)) ??
    layout.find((keyDef) => !keyDef.isSpacer)?.id;

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = ARROW_DIRECTIONS[event.key];
    const fromKey = event.target instanceof HTMLElement ? event.target.dataset.keyId : undefined;
    if (!direction || !fromKey) return;
    const next = neighborKey(layout, fromKey, direction);
    if (!next) return;
    event.preventDefault();
    gridRef.current?.querySelector<HTMLElement>(`[data-key-id="${CSS.escape(next)}"]`)?.focus();
    if (selectedKey) setSelectedKey(next);
  };

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
      <div className="absolute top-4 right-5 z-10 flex items-center gap-2 animate-fade-in">
        {hiddenRemappedKeys.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="rounded-md px-2 py-1 text-[11px] text-status-warning outline-none focus-visible:ring-1 focus-visible:ring-white/40">
                {hiddenRemappedKeys.length} remapped {hiddenRemappedKeys.length === 1 ? "key isn’t" : "keys aren’t"} shown
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {hiddenRemappedKeys.map(getKeyName).join(", ")}. Switch layouts to edit{" "}
              {hiddenRemappedKeys.length === 1 ? "it" : "them"}.
            </TooltipContent>
          </Tooltip>
        )}
        <Select value={layoutId} onValueChange={(value) => setLayoutId(value as KeyboardLayoutId)}>
          <SelectTrigger size="sm" aria-label="Keyboard layout" className="glass rounded-full border-none px-3 text-[11px] text-muted-foreground hover:text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {KEYBOARD_LAYOUTS.map((option) => (
              <SelectItem key={option.id} value={option.id} className="text-xs">
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        ref={gridRef}
        role="group"
        aria-label="Keyboard. Use arrow keys to move between keys."
        onKeyDown={handleGridKeyDown}
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

          const action = layerKeys[keyDef.id] || defaultActionFor(keyDef.id, isBaseLayer);
          const isSelected = selectedKey === keyDef.id;

          return (
            <Key
              key={keyDef.id}
              keyId={keyDef.id}
              keyDef={keyDef}
              action={action}
              baseAction={baseKeys[keyDef.id] || keyDef.id}
              isSelected={isSelected}
              onSelect={handleSelectKey}
              onFocusKey={setFocusedKey}
              isTabStop={keyDef.id === tabStopKey}
              unitSize={unitSize}
            />
          );
        })}
        {!hasRemaps && !selectedKey && (
          <p
            className="absolute inset-x-0 text-center text-xs text-muted-foreground animate-fade-in"
            style={{ top: `${(layoutHeight - 0.4) * unitSize}px` }}
          >
            Click any key to change what it does.
          </p>
        )}
      </div>
    </div>
  );
}
