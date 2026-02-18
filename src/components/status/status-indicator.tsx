import { useKanataActions, useKanataState } from "../../contexts";

/**
 * Status indicator badge showing Kanata process state.
 * Clicking toggles start/stop.
 */
export function StatusIndicator() {
  const { status, isRunning } = useKanataState();
  const { start, stop } = useKanataActions();
  const isTransitioning = status === "starting" || status === "stopping";
  const canToggle = !isTransitioning;

  const handleClick = async () => {
    if (!canToggle) {
      return;
    }

    if (isRunning) {
      await stop();
    } else {
      await start();
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case "running":
        return {
          label: "Live",
          bgClass: "bg-status-success/[0.06]",
          textClass: "text-status-success",
          dotClass: "bg-status-success animate-pulse-dot",
        };
      case "starting":
        return {
          label: "Starting...",
          bgClass: "bg-status-warning/[0.06]",
          textClass: "text-status-warning",
          dotClass: "bg-status-warning animate-pulse-warning",
        };
      case "stopping":
        return {
          label: "Stopping...",
          bgClass: "bg-status-warning/[0.06]",
          textClass: "text-status-warning",
          dotClass: "bg-status-warning animate-pulse-warning",
        };
      case "error":
        return {
          label: "Error",
          bgClass: "bg-status-error/[0.06]",
          textClass: "text-status-error",
          dotClass: "bg-status-error",
        };
      case "idle":
      case "stopped":
      default:
        return {
          label: "Stopped",
          bgClass: "bg-secondary",
          textClass: "text-muted-foreground",
          dotClass: "bg-muted-foreground",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canToggle}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        ${config.bgClass} ${config.textClass}
        text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60
        ${canToggle ? "hover:opacity-80 active:scale-95" : ""}
      `}
      title={
        isTransitioning
          ? "Kanata transition in progress"
          : isRunning
            ? "Click to stop Kanata"
            : "Click to start Kanata"
      }
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </button>
  );
}
