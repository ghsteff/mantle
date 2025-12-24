import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui";
import { formatAction } from "../../utils/format-action";
import { type KeyDef, getKeyLabel } from "../../utils/layout";
import { parseActionDetails } from "./utils/parse-action-details";

interface KeyProps {
  keyDef: KeyDef;
  action: string;
  isSelected: boolean;
  onClick: () => void;
  unitSize: number;
  showAction?: boolean;
}

/**
 * Renders a single key on the keyboard grid.
 */
export function Key({
  keyDef,
  action,
  isSelected,
  onClick,
  unitSize,
  showAction = false,
}: KeyProps) {
  const { label, subLabel } = getKeyLabel(keyDef.id);

  // Determine what to display based on showAction prop
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

  // Check if the action is different from the default (modified)
  const isModified = action !== keyDef.id && action !== "_";
  const isTransparent = action === "_";

  const width = keyDef.width * unitSize;
  const height = (keyDef.height || 1) * unitSize;

  // Position using CSS transform for precise placement
  const left = keyDef.col * unitSize;
  const top = keyDef.row * unitSize;

  // Calculate max characters based on key width (roughly 6 chars per unit width)
  const maxChars = Math.floor(keyDef.width * 6);
  const truncatedLabel =
    displayLabel.length > maxChars
      ? displayLabel.slice(0, maxChars - 1) + "…"
      : displayLabel;
  const truncatedSubLabel =
    displaySubLabel && displaySubLabel.length > maxChars
      ? displaySubLabel.slice(0, maxChars - 1) + "…"
      : displaySubLabel;

  // Show tooltip if content is truncated or if key has a modified action
  const needsTooltip =
    displayLabel.length > maxChars ||
    (displaySubLabel && displaySubLabel.length > maxChars) ||
    isModified;

  const keyButton = (
    <button
      type="button"
      onClick={onClick}
      className={`
        absolute font-mono text-xs select-none
        flex flex-col items-center justify-center overflow-hidden
        rounded-none border transition-all duration-100
        ${
          isSelected
            ? "bg-key-bg-selected border-primary text-text-bright"
            : "bg-key-bg border-key-border text-text-primary hover:bg-key-bg-hover"
        }
        ${isModified && !isSelected ? "border-accent/50" : ""}
        ${isTransparent ? "opacity-50" : ""}
        shadow-key active:shadow-key-pressed active:translate-y-[1px]
      `}
      style={{
        width: `${width - 4}px`,
        height: `${height - 4}px`,
        left: `${left + 2}px`,
        top: `${top + 2}px`,
      }}
    >
      {/* Main label */}
      <span
        className={`leading-none truncate max-w-full px-1 ${keyDef.width >= 1.5 ? "text-[10px]" : "text-xs"}`}
      >
        {truncatedLabel}
      </span>

      {/* Sub-label (shifted character or action secondary info) */}
      {truncatedSubLabel && (
        <span className="text-[9px] text-text-muted leading-none mt-0.5 truncate max-w-full px-1">
          {truncatedSubLabel}
        </span>
      )}

      {/* Modified indicator */}
      {isModified && (
        <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-primary" />
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
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-0 text-xs">
          <div className="font-semibold font-mono">{actionDetails.type}</div>
          {actionDetails.tap && (
            <div>
              <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-mono">
                Tap:
              </span>{" "}
              <span className="font-mono">{actionDetails.tap}</span>
            </div>
          )}
          {actionDetails.hold && (
            <div>
              <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-mono">
                Hold:
              </span>{" "}
              <span className="font-mono">{actionDetails.hold}</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
