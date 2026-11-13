import { useKanataActions, useKanataState } from "../../contexts";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui";
import { cn } from "@/lib/utils";

type StatusConfig = {
  label: string;
  hint: string;
  dotClass: string;
  textClass: string;
  bgClass: string;
  hoverClass: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  running: {
    label: "Live",
    hint: "Remapping is on. Click to turn it off.",
    dotClass: "bg-status-success animate-pulse-dot",
    textClass: "text-status-success",
    bgClass: "",
    hoverClass: "hover:bg-[rgba(52,211,153,0.08)]",
  },
  starting: {
    label: "Starting",
    hint: "Starting Kanata…",
    dotClass: "bg-status-warning animate-pulse-warning",
    textClass: "text-status-warning",
    bgClass: "",
    hoverClass: "",
  },
  stopping: {
    label: "Stopping",
    hint: "Stopping Kanata…",
    dotClass: "bg-status-warning animate-pulse-warning",
    textClass: "text-status-warning",
    bgClass: "",
    hoverClass: "",
  },
  error: {
    label: "Error",
    hint: "Kanata stopped with an error. Click to try again; the console has details.",
    dotClass: "bg-status-error",
    textClass: "text-status-error",
    bgClass: "",
    hoverClass: "hover:bg-[rgba(248,113,113,0.08)]",
  },
};

const DEFAULT_STATUS: StatusConfig = {
  label: "Off",
  hint: "Remapping is off. Click to turn it on.",
  dotClass: "bg-muted-foreground",
  textClass: "text-muted-foreground",
  bgClass: "",
  hoverClass: "hover:bg-white/[0.04]",
};

export function StatusIndicator() {
  const { status, isRunning } = useKanataState();
  const { start, stop } = useKanataActions();
  const isTransitioning = status === "starting" || status === "stopping";
  const canToggle = !isTransitioning;

  const handleClick = async () => {
    if (!canToggle) return;
    if (isRunning) {
      await stop();
    } else {
      await start();
    }
  };

  const config = STATUS_MAP[status] ?? DEFAULT_STATUS;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          disabled={!canToggle}
          aria-label={`Kanata: ${config.label}. ${config.hint}`}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            "text-[11px] font-medium tracking-wide",
            "transition-all duration-300 ease-out",
            "disabled:opacity-50",
            config.bgClass,
            config.textClass,
            canToggle && cn(config.hoverClass, "active:scale-[0.97]"),
          )}
        >
          <span className={cn("size-1.5 rounded-full", config.dotClass)} />
          <span>{config.label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">{config.hint}</TooltipContent>
    </Tooltip>
  );
}
