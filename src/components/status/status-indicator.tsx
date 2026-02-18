import { useKanataActions, useKanataState } from "../../contexts";
import { cn } from "@/lib/utils";

type StatusConfig = {
  label: string;
  dotClass: string;
  textClass: string;
  bgClass: string;
  hoverClass: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  running: {
    label: "Live",
    dotClass: "bg-status-success animate-pulse-dot",
    textClass: "text-status-success",
    bgClass: "",
    hoverClass: "hover:bg-[rgba(52,211,153,0.08)]",
  },
  starting: {
    label: "Starting",
    dotClass: "bg-status-warning animate-pulse-warning",
    textClass: "text-status-warning",
    bgClass: "",
    hoverClass: "",
  },
  stopping: {
    label: "Stopping",
    dotClass: "bg-status-warning animate-pulse-warning",
    textClass: "text-status-warning",
    bgClass: "",
    hoverClass: "",
  },
  error: {
    label: "Error",
    dotClass: "bg-status-error",
    textClass: "text-status-error",
    bgClass: "",
    hoverClass: "hover:bg-[rgba(248,113,113,0.08)]",
  },
};

const DEFAULT_STATUS: StatusConfig = {
  label: "Stopped",
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
    <button
      type="button"
      onClick={handleClick}
      disabled={!canToggle}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "text-[11px] font-medium tracking-wide",
        "transition-all duration-300 ease-out",
        "disabled:opacity-50",
        config.bgClass,
        config.textClass,
        canToggle && cn(config.hoverClass, "active:scale-[0.97]"),
      )}
      title={
        isTransitioning
          ? "Kanata transition in progress"
          : isRunning
            ? "Click to stop Kanata"
            : "Click to start Kanata"
      }
    >
      <span className={cn("size-1.5 rounded-full", config.dotClass)} />
      <span>{config.label}</span>
    </button>
  );
}
