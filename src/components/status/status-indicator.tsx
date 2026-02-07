import { useKanata } from "../../contexts";

/**
 * Status indicator badge showing Kanata process state.
 * Clicking toggles start/stop.
 */
export function StatusIndicator() {
  const { status, start, stop, isRunning } = useKanata();

  const handleClick = async () => {
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
      case "error":
        return {
          label: "Error",
          bgClass: "bg-status-error/[0.06]",
          textClass: "text-status-error",
          dotClass: "bg-status-error",
        };
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
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        ${config.bgClass} ${config.textClass}
        text-xs font-medium transition-all
        hover:opacity-80 active:scale-95
      `}
      title={isRunning ? "Click to stop Kanata" : "Click to start Kanata"}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </button>
  );
}
