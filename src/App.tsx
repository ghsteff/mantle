import { useState, useCallback, useEffect } from "react";
import {
  ConfigProvider,
  KanataProvider,
  useConfig,
  useKanata,
} from "./contexts";
import { KeyboardGrid } from "./components/keyboard";
import { KeyInspector, LayerTabs } from "./components/editor";
import { StatusIndicator } from "./components/status";
import { ProfileSwitcher } from "./components/profiles";
import { NewProfileDialog } from "./components/presets";
import { qwertyPreset } from "./presets";
import type { Preset } from "./presets";
import { Button } from "./components/ui";

/**
 * Header with layer tabs, apply changes button, and status indicator.
 */
function Header() {
  const {
    isDirty,
    applyChanges,
    discardChanges,
    hasProfiles,
    createProfile,
    switchProfile,
  } = useConfig();
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await applyChanges();
    } finally {
      setIsApplying(false);
    }
  };

  const handleNewProfile = useCallback(
    async (name: string, preset: Preset) => {
      const success = await createProfile(name, structuredClone(preset.config));
      if (success) {
        // Switch to the new profile
        await switchProfile(name);
      }
    },
    [createProfile, switchProfile]
  );

  return (
    <header className="h-12 bg-bg-secondary border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold text-text-primary">Mantle</h1>
        {hasProfiles && (
          <>
            <ProfileSwitcher />
            <div className="h-4 w-px bg-border" />
            <LayerTabs />
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {hasProfiles && <NewProfileDialog onComplete={handleNewProfile} />}
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
        <StatusIndicator />
      </div>
    </header>
  );
}

/**
 * Log panel to display Kanata process logs.
 */
function LogPanel() {
  const { logs, clearLogs, openInputMonitoringSettings } = useKanata();

  // Check if there's an Input Monitoring permission error
  const hasPermissionError = logs.some(
    (log) =>
      log.message.includes("not permitted") ||
      log.message.includes("Input Monitoring")
  );

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="h-40 bg-bg-secondary border-t border-border flex flex-col">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border">
        <span className="text-xs text-text-muted uppercase">Logs</span>
        <div className="flex items-center gap-2">
          {hasPermissionError && (
            <Button onClick={openInputMonitoringSettings} variant="outline">
              Open Input Monitoring Settings
            </Button>
          )}
          <Button onClick={clearLogs} variant="ghost">
            Clear
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {logs.map((log, i) => (
          <div
            key={i}
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
    </div>
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
