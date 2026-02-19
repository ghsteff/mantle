import { useEffect } from "react";
import { KeyInspector } from "./editor";
import { KeyboardGrid } from "./keyboard";
import {
  useConfigState,
  useProfile,
  useUIActions,
  useUIState,
} from "../contexts";
import { qwertyPreset } from "../presets";
import { cn } from "@/lib/utils";

export function MainContent() {
  const { isLoading, error, hasProfiles } = useConfigState();
  const { createProfile, switchProfile, refreshProfiles } = useProfile();
  const { setSelectedKey } = useUIActions();
  const { selectedKey } = useUIState();

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
    <>
      <main
        onPointerDownCapture={(event) => {
          if (!selectedKey) return;
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          if (target.closest("[data-key-editor-target='true']")) return;
          if (target.closest("[data-slot='drawer-content']")) return;
          setSelectedKey(null);
        }}
        className={cn(
          "relative flex flex-1 overflow-hidden noise-overlay transition-[padding] duration-300",
          selectedKey && "pr-80"
        )}
      >
        <KeyboardGrid />
      </main>
      <KeyInspector />
    </>
  );
}
