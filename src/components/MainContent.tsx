import { useEffect } from "react";
import { KeyInspector } from "./editor";
import { KeyboardGrid } from "./keyboard";
import { useConfigState, useProfile } from "../contexts";
import { qwertyPreset } from "../presets";

export function MainContent() {
  const { isLoading, error, hasProfiles } = useConfigState();
  const { createProfile, switchProfile, refreshProfiles } = useProfile();

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
        <span
          className="size-4 border-2 border-accent/40 border-t-accent rounded-full animate-spin"
          aria-label="Loading configuration"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-status-error text-sm font-medium mb-1">
            Something went wrong
          </div>
          <div className="text-muted-foreground text-xs max-w-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex overflow-hidden relative noise-overlay">
      <KeyboardGrid />
      <KeyInspector />
    </main>
  );
}
