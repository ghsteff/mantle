import { useEffect } from "react";
import { KeyInspector } from "./editor";
import { KeyboardGrid } from "./keyboard";
import { useConfig } from "../contexts";
import { qwertyPreset } from "../presets";

/**
 * Main content area with keyboard grid and inspector.
 */
export function MainContent() {
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
