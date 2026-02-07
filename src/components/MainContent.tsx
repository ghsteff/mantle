import { useEffect } from "react";
import { KeyInspector } from "./editor";
import { KeyboardGrid } from "./keyboard";
import { useConfig, useProfile } from "../contexts";
import { qwertyPreset } from "../presets";

/**
 * Main content area with keyboard grid and inspector.
 */
export function MainContent() {
  const { isLoading, error, hasProfiles } = useConfig();
  const { createProfile, switchProfile, refreshProfiles } = useProfile();

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
        <div className="text-muted-foreground">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-status-error text-lg mb-2">Error</div>
          <div className="text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <main
      className="flex-1 flex overflow-hidden relative"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.02), transparent)",
      }}
    >
      <KeyboardGrid />
      <KeyInspector />
    </main>
  );
}
