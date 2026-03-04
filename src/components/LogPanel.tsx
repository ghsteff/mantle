import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Trash2 } from "lucide-react";
import {
  AdminSetupModal,
  ExclusiveAccessModal,
  PermissionModal,
} from "./status";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui";
import { useKanataActions, useKanataState } from "../contexts";
import { cn } from "@/lib/utils";
import { MAX_VISIBLE_LOGS } from "../constants";

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function LogPanel() {
  const { logs, issue, status } = useKanataState();
  const {
    start,
    clearLogs,
    openInputMonitoringSettings,
    clearIssue,
  } = useKanataActions();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const previousLogCountRef = useRef(logs.length);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [unreadLogCount, setUnreadLogCount] = useState(0);

  useEffect(() => {
    if (status === "error") {
      setIsConsoleOpen(true);
    }
  }, [status]);

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
    const previousLogCount = previousLogCountRef.current;
    const nextLogCount = logs.length;
    const newLogs = Math.max(0, nextLogCount - previousLogCount);

    if (newLogs > 0 && !isConsoleOpen) {
      setUnreadLogCount((count) => count + newLogs);
    }

    previousLogCountRef.current = nextLogCount;
  }, [logs.length, isConsoleOpen]);

  useEffect(() => {
    if (isConsoleOpen) {
      setUnreadLogCount(0);
    }
  }, [isConsoleOpen]);

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

  useEffect(() => {
    if (!isConsoleOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-slot='drawer-content']")) return;
      if (target.closest("[data-slot='drawer-trigger']")) return;
      setIsConsoleOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isConsoleOpen]);

  return (
    <>
      <Drawer
        open={isConsoleOpen}
        onOpenChange={setIsConsoleOpen}
        direction="bottom"
        modal={false}
      >
        <DrawerTrigger asChild>
          <button
            type="button"
            className="h-9 bg-card/60 px-4 backdrop-blur-sm transition-colors hover:bg-card/80"
          >
            <div className="flex h-full items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <ChevronUp
                  className={cn(
                    "size-3 text-muted-foreground/70 transition-transform",
                    isConsoleOpen && "rotate-180"
                  )}
                />
                Console
                {unreadLogCount > 0 && (
                  <span className="rounded-full border border-border-subtle bg-muted px-1.5 py-0.5 text-[9px] leading-none text-muted-foreground">
                    +{unreadLogCount}
                  </span>
                )}
              </span>
            </div>
          </button>
        </DrawerTrigger>
        <DrawerContent
          direction="bottom"
          className="h-[320px] border-t border-border bg-card/95"
        >
          <DrawerHeader className="border-b border-border-subtle px-4 py-2" data-vaul-no-drag>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsConsoleOpen(false)}
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <ChevronUp className="size-3 rotate-180 text-muted-foreground/70" />
                <DrawerTitle className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Console
                  {hiddenLogCount > 0 && (
                    <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/50">
                      (last {MAX_VISIBLE_LOGS} of {logs.length})
                    </span>
                  )}
                </DrawerTitle>
              </button>
              <div className="flex items-center gap-2">
                {hasPermissionError && (
                  <Button
                    onClick={() => void openInputMonitoringSettings()}
                    variant="outline"
                    size="xs"
                  >
                    Open Input Monitoring
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={clearLogs}
                      variant="ghost"
                      size="icon-xs"
                      disabled={logs.length === 0}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear logs</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </DrawerHeader>
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            data-vaul-no-drag
            className="flex-1 overflow-auto px-4 py-2 font-mono text-[11px] leading-relaxed"
          >
            {logs.length === 0 && (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground/60">
                No logs yet.
              </div>
            )}
            {hiddenLogCount > 0 && (
              <div className="py-1 text-center text-[10px] text-muted-foreground/40">
                ... {hiddenLogCount} older log{hiddenLogCount !== 1 ? "s" : ""} hidden
              </div>
            )}
            {visibleLogs.map((log, i) => (
              <div
                key={`${log.timestamp}-${i}`}
                className={cn(
                  "flex px-0.5 py-px",
                  log.type === "stderr"
                    ? "text-status-error/80"
                    : "text-muted-foreground/60"
                )}
              >
                <span className="mr-3 shrink-0 select-none tabular-nums text-muted-foreground/30">
                  {formatTimestamp(log.timestamp)}
                </span>
                {log.message}
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
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
