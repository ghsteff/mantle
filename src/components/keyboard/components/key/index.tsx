import { memo, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui";
import { formatAction } from "../../utils/format-action";
import { type KeyDef, getKeyLabel } from "../../utils/layout";
import { parseActionDetails } from "./utils/parse-action-details";
import { cn } from "@/lib/utils";

interface KeyProps {
  keyId: string;
  keyDef: KeyDef;
  action: string;
  isSelected: boolean;
  onSelect: (keyId: string) => void;
  unitSize: number;
  showAction?: boolean;
}

export const Key = memo(function Key({
  keyId,
  keyDef,
  action,
  isSelected,
  onSelect,
  unitSize,
  showAction = false,
}: KeyProps) {
  const { label, subLabel } = getKeyLabel(keyDef.id);
  const handleClick = useCallback(() => {
    onSelect(keyId);
  }, [keyId, onSelect]);

  let displayLabel: string;
  let displaySubLabel: string | undefined;

  if (showAction) {
    const formatted = formatAction(action);
    displayLabel = formatted.primary;
    displaySubLabel = formatted.secondary;
  } else {
    displayLabel = label;
    displaySubLabel = subLabel;
  }

  const isModified = action !== keyDef.id && action !== "_";
  const isTransparent = action === "_";

  const width = keyDef.width * unitSize;
  const height = (keyDef.height || 1) * unitSize;
  const left = keyDef.col * unitSize;
  const top = keyDef.row * unitSize;

  const maxChars = Math.floor(keyDef.width * 6);
  const truncatedLabel =
    displayLabel.length > maxChars
      ? displayLabel.slice(0, maxChars - 1) + "…"
      : displayLabel;
  const truncatedSubLabel =
    displaySubLabel && displaySubLabel.length > maxChars
      ? displaySubLabel.slice(0, maxChars - 1) + "…"
      : displaySubLabel;

  const needsTooltip =
    displayLabel.length > maxChars ||
    (displaySubLabel && displaySubLabel.length > maxChars) ||
    isModified;

  const keyButton = (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "absolute font-mono select-none",
        "flex flex-col items-center justify-center overflow-hidden",
        "rounded-key border transition-all duration-150 ease-out",
        "bg-key-bg border-key-border shadow-key",
        "hover:bg-key-bg-hover hover:border-key-border-hover hover:shadow-key-hover hover:scale-[1.02]",
        "active:scale-[0.97] active:shadow-key-pressed active:duration-75",
        isSelected && "bg-key-bg-selected border-key-border-selected shadow-key-selected animate-glow-breathe scale-[1.02]",
        isTransparent && "opacity-35",
      )}
      style={{
        width: `${width - 4}px`,
        height: `${height - 4}px`,
        left: `${left + 2}px`,
        top: `${top + 2}px`,
      }}
    >
      <span
        className={cn(
          "leading-none truncate max-w-full px-1.5",
          keyDef.width >= 1.5 ? "text-[10px]" : "text-[11px]",
          isSelected ? "text-foreground" : "text-foreground/90",
          isTransparent && "text-foreground/40",
        )}
      >
        {truncatedLabel}
      </span>

      {truncatedSubLabel && (
        <span className={cn(
          "text-[9px] leading-none mt-0.5 truncate max-w-full px-1.5",
          isSelected ? "text-foreground/60" : "text-muted-foreground/70",
        )}>
          {truncatedSubLabel}
        </span>
      )}

      {isModified && (
        <div className="absolute bottom-1 right-1 size-1 rounded-full bg-white" />
      )}
    </button>
  );

  if (!needsTooltip) {
    return keyButton;
  }

  const actionDetails = parseActionDetails(action);

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{keyButton}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs animate-scale-in">
        <div className="space-y-0.5 text-xs">
          <div className="font-semibold font-mono">{actionDetails.type}</div>
          {actionDetails.tap && (
            <div className="flex items-center gap-1.5">
              <span className="text-background/50 text-[10px] uppercase tracking-widest font-mono">
                Tap
              </span>
              <span className="font-mono">{actionDetails.tap}</span>
            </div>
          )}
          {actionDetails.hold && (
            <div className="flex items-center gap-1.5">
              <span className="text-background/50 text-[10px] uppercase tracking-widest font-mono">
                Hold
              </span>
              <span className="font-mono">{actionDetails.hold}</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

Key.displayName = "Key";
