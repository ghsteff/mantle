import { useCallback, useEffect, useRef, useState } from "react";
import { KeyInspector, LayerTabs } from "./components/editor";
import { KeyboardGrid } from "./components/keyboard";
import { ProfileSwitcher, ImportExportButton } from "./components/profiles";
import { PermissionModal, StatusIndicator } from "./components/status";
import { Button, ResizablePanel } from "./components/ui";
import {
  ConfigProvider,
  KanataProvider,
  useConfig,
  useKanata,
} from "./contexts";
import { cn } from "./lib/utils";
import { qwertyPreset } from "./presets";

/**
 * Header with layer tabs, apply changes button, and status indicator.
 */
function Header() {
  const { isDirty, applyChanges, discardChanges, hasProfiles } = useConfig();
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await applyChanges();
    } finally {
      setIsApplying(false);
    }
  };

  const isMac = window.navigator.platform.toLowerCase().includes("mac");

  return (
    <header
      className={cn(
        "h-12 bg-bg-secondary border-b border-border flex items-center justify-between",
        isMac ? "drag-region pl-20 pr-4" : "px-4"
      )}
    >
      <div
        className={cn("flex items-center gap-4", isMac ? "no-drag-region" : "")}
      >
        <h1 className="text-sm font-semibold text-text-primary">Mantle</h1>
        {hasProfiles && (
          <>
            <ProfileSwitcher />
            <div className="h-4 w-px bg-border" />
            <LayerTabs />
          </>
        )}
      </div>
      <div
        className={cn("flex items-center gap-3", isMac ? "no-drag-region" : "")}
      >
        {isDirty && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Unsaved changes</span>
            <Button
              onClick={discardChanges}
              disabled={isApplying}
              variant="outline"
            >
              Discard
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying}
              variant="default"
            >
              {isApplying ? "Applying..." : "Apply Changes"}
            </Button>
          </div>
        )}
        <ImportExportButton />
        <StatusIndicator />
      </div>
    </header>
  );
}

const LOG_PANEL_HEIGHT_KEY = "kanata-log-panel-height";
const MIN_LOG_PANEL_HEIGHT = 100;
const MAX_LOG_PANEL_HEIGHT = 600;
const DEFAULT_LOG_PANEL_HEIGHT = 160;

/**
 * Log panel to display Kanata process logs.
 */
function LogPanel() {
  const { logs, clearLogs, openInputMonitoringSettings } = useKanata();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Limit visible logs to most recent 200 for performance
  const MAX_VISIBLE_LOGS = 200;
  const visibleLogs =
    logs.length > MAX_VISIBLE_LOGS ? logs.slice(-MAX_VISIBLE_LOGS) : logs;
  const hiddenLogCount = logs.length - visibleLogs.length;

  // Check if there's an Input Monitoring permission error
  const hasPermissionError = logs.some(
    (log) =>
      log.message.includes("not permitted") ||
      log.message.includes("Input Monitoring")
  );

  // Show permission modal automatically when permission error is detected
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const hasShownModalRef = useRef(false);

  useEffect(() => {
    if (hasPermissionError && !hasShownModalRef.current) {
      hasShownModalRef.current = true;
      setShowPermissionModal(true);
    }
  }, [hasPermissionError]);

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
      className="bg-bg-secondary border-t border-border"
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-border">
        <span className="text-xs text-text-muted uppercase">
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
          <Button onClick={clearLogs} variant="ghost">
            Clear
          </Button>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-2 font-mono text-xs"
      >
        {hiddenLogCount > 0 && (
          <div className="text-text-muted text-center py-1">
            ... {hiddenLogCount} older log{hiddenLogCount !== 1 ? "s" : ""}{" "}
            hidden ...
          </div>
        )}
        {visibleLogs.map((log, i) => (
          <div
            key={`${log.timestamp}-${i}`}
            className={
              log.type === "stderr"
                ? "text-status-error"
                : "text-text-secondary"
            }
          >
            {log.message}
          </div>
        ))}
      </div>
      <PermissionModal
        open={showPermissionModal}
        onOpenChange={setShowPermissionModal}
        onOpenSettings={openInputMonitoringSettings}
      />
    </ResizablePanel>
  );
}

/**
 * Main content area with keyboard grid and inspector.
 */
function MainContent() {
  const {
    isLoading,
    error,
    hasProfiles,
    createProfile,
    switchProfile,
    refreshProfiles,
  } = useConfig();

  // Auto-create default profile if none exists
  useEffect(() => {
    if (!isLoading && !hasProfiles) {
      const createDefault = async () => {
        const success = await createProfile(
          "default",
          structuredClone(qwertyPreset.config)
        );
        if (success) {
          await switchProfile("default");
          await refreshProfiles();
        }
      };
      createDefault();
    }
  }, [isLoading, hasProfiles, createProfile, switchProfile, refreshProfiles]);

  if (isLoading || !hasProfiles) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-muted">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-status-error text-lg mb-2">Error</div>
          <div className="text-text-muted">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex overflow-hidden relative">
      <div
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--primary-foreground) 1px, transparent 1px),
            linear-gradient(to bottom, var(--primary-foreground) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
      <KeyboardGrid />
      <KeyInspector />
    </main>
  );
}

/**
 * Root application component.
 */
export function App() {
  return (
    <KanataProvider>
      <ConfigProvider>
        <div className="h-full flex flex-col bg-bg-primary">
          <Header />
          <MainContent />
          <LogPanel />
        </div>
      </ConfigProvider>
    </KanataProvider>
  );
}
