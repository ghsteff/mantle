import { type KeyDef, getKeyLabel } from "./layout";
import { formatAction } from "./utils/format-action";

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

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        absolute font-mono text-xs select-none
        flex flex-col items-center justify-center
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
      title={`${keyDef.id}: ${action}`}
    >
      {/* Main label */}
      <span
        className={`leading-none ${keyDef.width >= 1.5 ? "text-[10px]" : "text-xs"}`}
      >
        {displayLabel}
      </span>

      {/* Sub-label (shifted character or action secondary info) */}
      {displaySubLabel && (
        <span className="text-[9px] text-text-muted leading-none mt-0.5">
          {displaySubLabel}
        </span>
      )}

      {/* Modified indicator */}
      {isModified && (
        <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-primary" />
      )}
    </button>
  );
}
