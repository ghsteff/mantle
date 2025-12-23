import { type KeyDef, getKeyLabel } from "./layout";

interface KeyProps {
  keyDef: KeyDef;
  action: string;
  isSelected: boolean;
  onClick: () => void;
  unitSize: number;
}

/**
 * Renders a single key on the keyboard grid.
 */
export function Key({ keyDef, action, isSelected, onClick, unitSize }: KeyProps) {
  const { label, subLabel } = getKeyLabel(keyDef.id);
  
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
        rounded-md border transition-all duration-100
        ${isSelected
          ? "bg-key-bg-selected border-accent text-text-bright ring-2 ring-accent"
          : "bg-key-bg border-key-border text-text-primary hover:bg-key-bg-hover"
        }
        ${isModified && !isSelected ? "border-accent/50" : ""}
        ${isTransparent ? "opacity-60" : ""}
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
      {/* Sub-label (shifted character) */}
      {subLabel && (
        <span className="text-[9px] text-text-muted leading-none mb-0.5">
          {subLabel}
        </span>
      )}
      
      {/* Main label */}
      <span className={`leading-none ${keyDef.width >= 1.5 ? "text-[10px]" : "text-xs"}`}>
        {label}
      </span>
      
      {/* Modified indicator */}
      {isModified && (
        <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
      )}
    </button>
  );
}

