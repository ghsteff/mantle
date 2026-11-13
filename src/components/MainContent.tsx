import { useEffect, useRef } from "react";
import { KeyInspector } from "./editor";
import { KeyboardGrid } from "./keyboard";
import { Button } from "./ui";
import {
  useConfigActions,
  useConfigState,
  useProfile,
  useUIActions,
  useUIState,
} from "../contexts";
import { qwertyPreset } from "../presets";
import { cn } from "@/lib/utils";

export function MainContent() {
  const { config, loadState, error, profiles } = useConfigState();
  const { reloadConfig } = useConfigActions();
  const { createProfile, switchProfile, refreshProfiles } = useProfile();
  const { setSelectedKey, setActiveLayer } = useUIActions();
  const { selectedKey, activeLayer } = useUIState();
  const defaultProfileBootstrapStateRef = useRef<"idle" | "in_progress" | "done">("idle");
  const hasProfiles = profiles.length > 0;
  const isLoading = loadState === "loading";

  // When the active layer disappears (deleted, renamed, undone), stay at the same tab position.
  const previousLayerNamesRef = useRef<string[]>([]);
  useEffect(() => {
    if (!config || config.layers.length === 0) return;
    const names = config.layers.map((layer) => layer.name);
    if (!names.includes(activeLayer)) {
      const previousIndex = previousLayerNamesRef.current.indexOf(activeLayer);
      const index = previousIndex === -1 ? 0 : Math.min(previousIndex, names.length - 1);
      setActiveLayer(names[index]);
    }
    previousLayerNamesRef.current = names;
  }, [config, activeLayer, setActiveLayer]);

  useEffect(() => {
    if (!selectedKey) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Escape belongs to whichever popover, menu or dialog is open on top.
      if (document.querySelector("[role='dialog']:not([data-slot='drawer-content']), [role='alertdialog'], [role='menu'], [role='listbox']")) return;
      setSelectedKey(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedKey, setSelectedKey]);

  useEffect(() => {
    if (defaultProfileBootstrapStateRef.current !== "idle") {
      return;
    }
    if (!isLoading && !hasProfiles) {
      defaultProfileBootstrapStateRef.current = "in_progress";
      const createDefault = async () => {
        const success = await createProfile(
          "default",
          structuredClone(qwertyPreset.config)
        );
        if (!success) {
          defaultProfileBootstrapStateRef.current = "idle";
          return;
        }

        await switchProfile("default");
        await refreshProfiles();
        defaultProfileBootstrapStateRef.current = "done";
      };
      createDefault();
    }
  }, [isLoading, hasProfiles, createProfile, switchProfile, refreshProfiles]);

  if (!config && loadState === "error") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in space-y-3">
          <div>
            <div className="text-sm font-medium text-foreground mb-1">
              Couldn’t load your keyboard configuration
            </div>
            <div className="text-muted-foreground text-xs max-w-sm">{error}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => void reloadConfig()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!config || !hasProfiles) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span
          className="size-4 border-2 border-accent/40 border-t-accent rounded-full animate-spin"
          aria-label="Loading configuration"
        />
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
