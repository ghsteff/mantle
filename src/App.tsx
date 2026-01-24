import { useCallback, useEffect, useRef, useState } from "react";
import { KeyInspector, LayerTabs } from "./components/editor";
import { KeyboardGrid } from "./components/keyboard";
import { KarabinerOnboardingModal } from "./components/onboarding";
import { ProfileSwitcher, ImportExportButton } from "./components/profiles";
import { PermissionModal, StatusIndicator } from "./components/status";
import { Button, ResizablePanel } from "./components/ui";
import {
  ConfigProvider,
  KanataProvider,
  KarabinerProvider,
  useConfig,
  useKanata,
  useKarabiner,
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
  const {
    logs,
    clearLogs,
    openInputMonitoringSettings,
    permissionDenied,
    clearPermissionDenied,
  } = useKanata();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Limit visible logs to most recent 200 for performance
  const MAX_VISIBLE_LOGS = 200;
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
        onOpenChange={handleModalClose}
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
 * Karabiner onboarding flow shown when driver is not installed (macOS only).
 */
function KarabinerOnboarding() {
  const { driverInstalled, checkStatus } = useKarabiner();
  const { openInputMonitoringSettings, start, status } = useKanata();
  const { hasProfiles, isLoading } = useConfig();
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Only show on macOS
  const isMac = window.navigator.platform.toLowerCase().includes("mac");

  // Start onboarding when driver is not installed
  useEffect(() => {
    if (isMac && driverInstalled === false && !onboardingStarted && !onboardingCompleted) {
      setOnboardingStarted(true);
    }
  }, [isMac, driverInstalled, onboardingStarted, onboardingCompleted]);

  // Keep modal open once started, until user clicks "Done"
  const showOnboarding = onboardingStarted && !onboardingCompleted;

  const handleComplete = useCallback(() => {
    setOnboardingCompleted(true);
    setOnboardingStarted(false);
    // Re-check status in case user completed installation
    checkStatus();
  }, [checkStatus]);

  // Auto-start server after onboarding is completed
  const hasStartedAfterOnboardingRef = useRef(false);

  useEffect(() => {
    console.log("[OnboardingAutoStart] Checking conditions", {
      onboardingCompleted,
      driverInstalled,
      status,
      hasProfiles,
      isLoading,
      hasStarted: hasStartedAfterOnboardingRef.current,
    });

    if (
      onboardingCompleted &&
      driverInstalled &&
      status === "stopped" &&
      !isLoading &&
      hasProfiles &&
      !hasStartedAfterOnboardingRef.current
    ) {
      console.log("[OnboardingAutoStart] Starting server after onboarding");
      hasStartedAfterOnboardingRef.current = true;
      // Small delay to let the user see the UI before starting
      setTimeout(() => {
        start();
      }, 500);
    }
  }, [onboardingCompleted, driverInstalled, status, hasProfiles, isLoading, start]);

  return (
    <KarabinerOnboardingModal
      open={showOnboarding}
      onComplete={handleComplete}
      onOpenInputMonitoringSettings={openInputMonitoringSettings}
    />
  );
}

/**
 * Auto-start the Kanata server on app boot if conditions are met.
 */
function AutoStartServer() {
  const { driverInstalled } = useKarabiner();
  const { status, start } = useKanata();
  const { hasProfiles, isLoading } = useConfig();
  const hasAttemptedStartRef = useRef(false);

  useEffect(() => {
    console.log("[AutoStart] Effect running", {
      driverInstalled,
      status,
      hasProfiles,
      isLoading,
      hasAttemptedStart: hasAttemptedStartRef.current,
    });

    // Only auto-start once per app session
    if (hasAttemptedStartRef.current) {
      console.log("[AutoStart] Already attempted, skipping");
      return;
    }

    // Check if we should auto-start:
    // 1. Driver is installed (null means still checking, false means not installed)
    // 2. Server is stopped
    // 3. Config is loaded and has profiles
    // 4. We haven't tried starting yet
    if (
      driverInstalled === true &&
      status === "stopped" &&
      !isLoading &&
      hasProfiles
    ) {
      console.log("[AutoStart] All conditions met, starting immediately");
      hasAttemptedStartRef.current = true;
      // Start immediately - no delay needed since all conditions are met
      start();
    } else {
      console.log("[AutoStart] Conditions not met, waiting");
    }
  }, [driverInstalled, status, hasProfiles, isLoading, start]);

  return null;
}

/**
 * Root application component.
 */
export function App() {
  return (
    <KarabinerProvider>
      <KanataProvider>
        <ConfigProvider>
          <div className="h-full flex flex-col bg-bg-primary">
            <KarabinerOnboarding />
            <AutoStartServer />
            <Header />
            <MainContent />
            <LogPanel />
          </div>
        </ConfigProvider>
      </KanataProvider>
    </KarabinerProvider>
  );
}
