import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { PermissionModal } from "./status";
import {
  Button,
  ResizablePanel,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./ui";
import { useKanata } from "../contexts";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOG_PANEL_HEIGHT,
  MIN_LOG_PANEL_HEIGHT,
  MAX_LOG_PANEL_HEIGHT,
  MAX_VISIBLE_LOGS,
} from "../constants";

const LOG_PANEL_HEIGHT_KEY = "kanata-log-panel-height";

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Log panel to display Kanata process logs.
 */
export function LogPanel() {
  const {
    logs,
    clearLogs,
    openInputMonitoringSettings,
    permissionDenied,
    clearPermissionDenied,
  } = useKanata();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Limit visible logs for performance
  const visibleLogs =
    logs.length > MAX_VISIBLE_LOGS ? logs.slice(-MAX_VISIBLE_LOGS) : logs;
  const hiddenLogCount = logs.length - visibleLogs.length;

  // Check if there's an Input Monitoring permission error in logs (for UI button)
  const hasPermissionError = logs.some(
    (log) =>
      log.message.includes("not permitted") ||
      log.message.includes("Input Monitoring")
  );

  // Permission modal state - triggered by the permission-denied event from main process
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Show modal when permission denied event fires
  useEffect(() => {
    if (permissionDenied) {
      setShowPermissionModal(true);
    }
  }, [permissionDenied]);

  // Clear the permission denied flag when modal is closed
  const handleModalClose = useCallback(
    (open: boolean) => {
      setShowPermissionModal(open);
      if (!open) {
        clearPermissionDenied();
      }
    },
    [clearPermissionDenied]
  );

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (shouldAutoScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [logs.length]);

  // Track scroll position to determine if we should auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    // Auto-scroll if user is near the bottom (within 50px)
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  if (logs.length === 0) {
    return null;
  }

  return (
    <ResizablePanel
      defaultHeight={DEFAULT_LOG_PANEL_HEIGHT}
      minHeight={MIN_LOG_PANEL_HEIGHT}
      maxHeight={MAX_LOG_PANEL_HEIGHT}
      storageKey={LOG_PANEL_HEIGHT_KEY}
      resizeHandlePosition="top"
      className="bg-card border-t border-border"
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-border">
        <span className="text-xs text-muted-foreground">
          Logs
          {hiddenLogCount > 0 &&
            ` (showing last ${MAX_VISIBLE_LOGS} of ${logs.length})`}
        </span>
        <div className="flex items-center gap-2">
          {hasPermissionError && (
            <Button
              onClick={() => setShowPermissionModal(true)}
              variant="outline"
            >
              Fix Permission Issue
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={clearLogs} variant="ghost" size="icon-xs">
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear logs</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-relaxed"
      >
        {hiddenLogCount > 0 && (
          <div className="text-muted-foreground text-center py-1">
            ... {hiddenLogCount} older log{hiddenLogCount !== 1 ? "s" : ""}{" "}
            hidden ...
          </div>
        )}
        {visibleLogs.map((log, i) => (
          <div
            key={`${log.timestamp}-${i}`}
            className={cn(
              "flex px-1",
              log.type === "stderr"
                ? "text-status-error"
                : "text-muted-foreground",
              i % 2 === 0 && "bg-white/[0.02]"
            )}
          >
            <span className="text-muted-foreground select-none mr-3 tabular-nums shrink-0">
              {formatTimestamp(log.timestamp)}
            </span>
            {log.message}
          </div>
        ))}
      </div>
      <PermissionModal
        open={showPermissionModal}
        onOpenChange={handleModalClose}
        onOpenSettings={openInputMonitoringSettings}
      />
    </ResizablePanel>
  );
}
