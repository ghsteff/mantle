import type { Preset } from "../../presets";
import { ALL_PRESETS } from "../../presets";
import {
  KeyboardIcon,
  ArrowUpFromDotIcon,
  Rows3Icon,
  NavigationIcon,
  LayoutGridIcon,
  CheckIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Keyboard: KeyboardIcon,
  ArrowUpFromDot: ArrowUpFromDotIcon,
  Rows3: Rows3Icon,
  Navigation: NavigationIcon,
  LayoutGrid: LayoutGridIcon,
};

interface PresetListItemProps {
  preset: Preset;
  isSelected?: boolean;
  onClick: () => void;
}

function PresetListItem({ preset, isSelected, onClick }: PresetListItemProps) {
  const { metadata } = preset;
  const IconComponent = metadata.icon
    ? ICON_MAP[metadata.icon] ?? KeyboardIcon
    : KeyboardIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 p-4 text-left transition-colors font-mono w-full",
        isSelected
          ? "bg-primary/10"
          : "bg-card hover:bg-secondary"
      )}
    >
      {/* Selection Indicator / Icon */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center border",
          isSelected
            ? "border-primary text-primary bg-primary/10"
            : "border-border text-muted-foreground group-hover:text-foreground group-hover:border-muted-foreground"
        )}
      >
        {isSelected ? (
          <CheckIcon className="size-4" />
        ) : (
          <IconComponent className="size-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className={cn(
            "text-sm font-bold uppercase tracking-tight truncate",
            isSelected ? "text-primary" : "text-foreground"
          )}>
            {metadata.name}
          </h3>
          <span
            className={cn(
              "text-[9px] uppercase tracking-wider border px-1 py-px shrink-0",
              metadata.category === "layout" && "border-blue-500/30 text-blue-400",
              metadata.category === "modifier" && "border-purple-500/30 text-purple-400",
              metadata.category === "layer" && "border-green-500/30 text-green-400"
            )}
          >
            {metadata.category}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {metadata.description}
        </p>
      </div>
    </button>
  );
}

interface PresetPickerProps {
  selectedPresetId?: string;
  onSelect: (preset: Preset) => void;
  className?: string;
}

/**
 * List of preset options for selecting a keyboard preset.
 */
export function PresetPicker({
  selectedPresetId,
  onSelect,
  className,
}: PresetPickerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-px bg-border border border-border",
        className
      )}
    >
      {ALL_PRESETS.map((preset) => (
        <PresetListItem
          key={preset.metadata.id}
          preset={preset}
          isSelected={preset.metadata.id === selectedPresetId}
          onClick={() => onSelect(preset)}
        />
      ))}
    </div>
  );
}
