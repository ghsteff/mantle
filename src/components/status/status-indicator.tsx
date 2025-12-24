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
          bgClass: "bg-status-success-bg",
          textClass: "text-status-success",
          dotClass: "bg-status-success animate-pulse-glow",
        };
      case "starting":
        return {
          label: "Starting...",
          bgClass: "bg-status-warning-bg",
          textClass: "text-status-warning",
          dotClass: "bg-status-warning animate-pulse-warning",
        };
      case "error":
        return {
          label: "Error",
          bgClass: "bg-status-error-bg",
          textClass: "text-status-error",
          dotClass: "bg-status-error",
        };
      case "stopped":
      default:
        return {
          label: "Stopped",
          bgClass: "bg-bg-tertiary",
          textClass: "text-text-muted",
          dotClass: "bg-text-muted",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        flex items-center gap-2 px-3 py-1.5
        ${config.bgClass} ${config.textClass}
        text-sm font-medium transition-all
        hover:opacity-80 active:scale-95
      `}
      title={isRunning ? "Click to stop Kanata" : "Click to start Kanata"}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </button>
  );
}
