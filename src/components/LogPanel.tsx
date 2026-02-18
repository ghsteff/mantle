import { useCallback, useEffect, useMemo, useRef } from "react";
import { Trash2 } from "lucide-react";
import {
  AdminSetupModal,
  ExclusiveAccessModal,
  PermissionModal,
} from "./status";
import {
  Button,
  ResizablePanel,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./ui";
import { useKanataActions, useKanataState } from "../contexts";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOG_PANEL_HEIGHT,
  MIN_LOG_PANEL_HEIGHT,
  MAX_LOG_PANEL_HEIGHT,
  MAX_VISIBLE_LOGS,
} from "../constants";

const LOG_PANEL_HEIGHT_KEY = "kanata-log-panel-height";

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function LogPanel() {
  const { logs, issue } = useKanataState();
  const {
    start,
    clearLogs,
    openInputMonitoringSettings,
    clearIssue,
  } = useKanataActions();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const visibleLogs = useMemo(
    () => (logs.length > MAX_VISIBLE_LOGS ? logs.slice(-MAX_VISIBLE_LOGS) : logs),
    [logs]
  );
  const hiddenLogCount = logs.length - visibleLogs.length;

  const hasPermissionError = useMemo(
    () =>
      issue === "permission-denied" ||
      logs.some(
        (log) =>
          log.message.includes("not permitted") ||
          log.message.includes("Input Monitoring")
      ),
    [issue, logs]
  );

  const handleModalClose = useCallback(
    (open: boolean) => {
      if (!open) clearIssue();
    },
    [clearIssue]
  );

  const handleExclusiveAccessModalClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) clearIssue();
    },
    [clearIssue]
  );

  const handleAdminSetupModalClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) clearIssue();
    },
    [clearIssue]
  );

  useEffect(() => {
    if (shouldAutoScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [logs.length]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  return (
    <>
      {logs.length > 0 && (
        <ResizablePanel
          defaultHeight={DEFAULT_LOG_PANEL_HEIGHT}
          minHeight={MIN_LOG_PANEL_HEIGHT}
          maxHeight={MAX_LOG_PANEL_HEIGHT}
          storageKey={LOG_PANEL_HEIGHT_KEY}
          resizeHandlePosition="top"
          className="bg-card/60 backdrop-blur-sm border-t border-border"
        >
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-border-subtle">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
              Console
              {hiddenLogCount > 0 && (
                <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/50">
                  (last {MAX_VISIBLE_LOGS} of {logs.length})
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {hasPermissionError && (
                <Button onClick={() => void openInputMonitoringSettings()} variant="outline" size="xs">
                  Open Input Monitoring
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={clearLogs} variant="ghost" size="icon-xs">
                    <Trash2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear logs</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto px-4 py-2 font-mono text-[11px] leading-relaxed"
          >
            {hiddenLogCount > 0 && (
              <div className="text-muted-foreground/40 text-center py-1 text-[10px]">
                … {hiddenLogCount} older log{hiddenLogCount !== 1 ? "s" : ""} hidden
              </div>
            )}
            {visibleLogs.map((log, i) => (
              <div
                key={`${log.timestamp}-${i}`}
                className={cn(
                  "flex px-0.5 py-px",
                  log.type === "stderr"
                    ? "text-status-error/80"
                    : "text-muted-foreground/60",
                )}
              >
                <span className="text-muted-foreground/30 select-none mr-3 tabular-nums shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
                {log.message}
              </div>
            ))}
          </div>
        </ResizablePanel>
      )}
      <PermissionModal
        open={issue === "permission-denied"}
        onOpenChange={handleModalClose}
        onOpenSettings={openInputMonitoringSettings}
      />
      <ExclusiveAccessModal
        open={issue === "exclusive-access-denied"}
        onOpenChange={handleExclusiveAccessModalClose}
      />
      <AdminSetupModal
        open={
          issue === "admin-setup-required" || issue === "admin-setup-cancelled"
        }
        cancelled={issue === "admin-setup-cancelled"}
        onOpenChange={handleAdminSetupModalClose}
        onRetry={() => {
          void start();
        }}
      />
    </>
  );
}
