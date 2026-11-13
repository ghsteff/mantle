import { memo, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui";
import { describeAction, formatAction } from "../../utils/format-action";
import { type KeyDef, getKeyLabel, getKeyName } from "../../utils/layout";
import { TRANSPARENT } from "@/kanata/key-action";
import { cn } from "@/lib/utils";

interface KeyProps {
  keyId: string;
  keyDef: KeyDef;
  action: string;
  /** What the key does on the base layer, shown when this layer passes the key through. */
  baseAction: string;
  isSelected: boolean;
  onSelect: (keyId: string) => void;
  onFocusKey: (keyId: string) => void;
  /** Only one key is in the Tab order; arrow keys move between the rest. */
  isTabStop: boolean;
  unitSize: number;
}

function truncate(text: string | undefined, maxChars: number) {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

export const Key = memo(function Key({
  keyId,
  keyDef,
  action,
  baseAction,
  isSelected,
  onSelect,
  onFocusKey,
  isTabStop,
  unitSize,
}: KeyProps) {
  const physical = getKeyLabel(keyDef.id);
  const handleClick = useCallback(() => {
    onSelect(keyId);
  }, [keyId, onSelect]);

  const isTransparent = action === TRANSPARENT;
  const isModified = action !== keyDef.id && !isTransparent;

  let label = physical.label;
  let subLabel = physical.subLabel;
  if (isModified) {
    const formatted = formatAction(action);
    label = formatted.primary;
    subLabel = formatted.secondary;
  } else if (isTransparent && baseAction !== keyDef.id) {
    const formatted = formatAction(baseAction);
    label = formatted.primary;
    subLabel = formatted.secondary;
  }

  const width = keyDef.width * unitSize;
  const height = (keyDef.height || 1) * unitSize;
  const maxChars = Math.floor(keyDef.width * 6);
  const maxSubLabelChars = Math.floor(keyDef.width * 8);
  const description = isTransparent
    ? `Passes through to the base layer`
    : describeAction(action);
  const needsTooltip = isModified || isTransparent || label.length > maxChars;

  const keyButton = (
    <button
      type="button"
      onClick={handleClick}
      onFocus={() => onFocusKey(keyId)}
      tabIndex={isTabStop ? 0 : -1}
      data-key-id={keyId}
      data-key-editor-target="true"
      aria-label={`${getKeyName(keyId)}: ${description}`}
      aria-pressed={isSelected}
      className={cn(
        "absolute font-mono select-none outline-none",
        "flex flex-col items-center justify-center overflow-hidden",
        "rounded-key border transition-all duration-150 ease-out",
        "bg-key-bg border-key-border shadow-key",
        "hover:bg-key-bg-hover hover:border-key-border-hover hover:shadow-key-hover hover:scale-[1.02]",
        "active:scale-[0.97] active:shadow-key-pressed active:duration-75",
        "focus-visible:ring-1 focus-visible:ring-white/50",
        isModified && "bg-key-bg-modified border-key-border-modified",
        isSelected && "bg-key-bg-selected border-key-border-selected shadow-key-selected animate-glow-breathe scale-[1.02]",
        isTransparent && !isSelected && "opacity-40",
      )}
      style={{
        width: `${width - 4}px`,
        height: `${height - 4}px`,
        left: `${keyDef.col * unitSize + 2}px`,
        top: `${keyDef.row * unitSize + 2}px`,
      }}
    >
      {isModified && label !== physical.label && (
        <span className="absolute left-1.5 top-1 max-w-[calc(100%-12px)] truncate text-[8px] leading-none text-muted-foreground/70">
          {physical.label}
        </span>
      )}

      <span
        className={cn(
          "leading-none truncate max-w-full px-1.5",
          keyDef.width >= 1.5 ? "text-[10px]" : "text-[11px]",
          isModified && label !== physical.label && "mt-1.5",
          isModified && "font-semibold text-foreground",
          !isModified && (isSelected ? "text-foreground" : "text-foreground/90"),
        )}
      >
        {truncate(label, maxChars)}
      </span>

      {subLabel && (
        <span className={cn(
          "text-[9px] leading-none mt-0.5 truncate max-w-full px-0.5 tracking-tight",
          isModified ? "text-foreground/60" : "text-muted-foreground/70",
        )}>
          {truncate(subLabel, maxSubLabelChars)}
        </span>
      )}
    </button>
  );

  // Always wrapped so the button isn't remounted (losing focus) when the tooltip turns on or off.
  return (
    <Tooltip delayDuration={400} open={needsTooltip ? undefined : false}>
      <TooltipTrigger asChild>{keyButton}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs animate-scale-in">
        <div className="space-y-0.5 text-xs">
          <div className="font-semibold">{getKeyName(keyId)}</div>
          <div>{description}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

Key.displayName = "Key";
