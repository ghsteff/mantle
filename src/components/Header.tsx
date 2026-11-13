import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Redo2Icon, Undo2Icon } from "lucide-react";
import { LayerTabs } from "./editor";
import { ProfileSwitcher } from "./profiles";
import { StatusIndicator } from "./status";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "./ui";
import {
  useConfigActions,
  useConfigState,
  useKanataActions,
  useKanataState,
  useProfile,
  useToast,
} from "../contexts";
import { cn } from "@/lib/utils";

// Open overlays that own the keyboard. The console drawer is non-modal, so it doesn't count.
const OVERLAY_SELECTOR =
  "[role='dialog']:not([data-slot='drawer-content']), [role='alertdialog'], [role='menu'], [role='listbox']";

export function Header() {
  const { isDirty, profiles, canUndo, canRedo } = useConfigState();
  const { applyChanges, discardChanges, undo, redo, getUndoDepth, undoFrom } = useConfigActions();
  const { refreshProfiles } = useProfile();
  const { isRunning } = useKanataState();
  const { restart, start } = useKanataActions();
  const { showToast } = useToast();
  const [isApplying, setIsApplying] = useState(false);
  const hasProfiles = profiles.length > 0;

  const handleApply = useCallback(async () => {
    setIsApplying(true);
    try {
      const saved = await applyChanges(refreshProfiles);
      if (!saved) {
        showToast({
          tone: "error",
          title: "Couldn’t save your changes",
          description: "Your edits are still here. Check the console for details and try again.",
        });
        return;
      }
      if (!isRunning) {
        showToast({
          tone: "info",
          title: "Changes saved",
          description: "Remapping is off, so they’ll take effect when you start it.",
          action: { label: "Start", onClick: () => void start() },
        });
        return;
      }
      const restarted = await restart();
      showToast(
        restarted
          ? { tone: "success", title: "Changes applied" }
          : {
              tone: "error",
              title: "Saved, but Kanata didn’t restart",
              description: "Open the console to see what went wrong.",
            },
      );
    } finally {
      setIsApplying(false);
    }
  }, [applyChanges, isRunning, refreshProfiles, restart, showToast, start]);

  const handleDiscard = async () => {
    await discardChanges();
    const depth = getUndoDepth();
    showToast({
      tone: "info",
      title: "Changes discarded",
      action: {
        label: "Undo",
        onClick: () => {
          if (!undoFrom(depth)) showToast({ tone: "info", title: "Use ⌘Z to step back through your edits" });
        },
      },
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() !== "z" && event.key.toLowerCase() !== "y") return;
      const target = event.target;
      // Text fields, dialogs and menus keep their own undo.
      if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']")) return;
      if (document.querySelector(OVERLAY_SELECTOR)) return;
      const wantsRedo = event.key.toLowerCase() === "y" || event.shiftKey;
      event.preventDefault();
      if (wantsRedo) redo();
      else undo();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (!isDirty || isApplying) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleApply();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApply, isApplying, isDirty]);

  const handleHeaderMouseDown = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (
      target.closest(
        "button, a, input, select, textarea, [role='button'], [role='switch'], [role='tab'], [data-no-window-drag='true']",
      )
    ) {
      return;
    }

    void getCurrentWindow().startDragging();
  };

  return (
    <header
      className="relative h-11 bg-background/30 backdrop-blur-xl border-b border-white/5 flex items-center justify-between pl-20 pr-4 z-20"
      onMouseDown={handleHeaderMouseDown}
    >
      <div className="relative z-10 flex items-center gap-3">
        {hasProfiles && (
          <>
            <ProfileSwitcher />
            <div className="h-3.5 w-px bg-border/50" />
            <LayerTabs />
          </>
        )}
      </div>

      <div className="relative z-10 flex-1 h-full" />

      <div className="relative z-10 flex items-center gap-2">
        {(canUndo || canRedo) && (
          <div className="flex items-center animate-fade-in">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={undo} disabled={!canUndo} aria-label="Undo">
                  <Undo2Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Undo <kbd className="ml-1 font-mono opacity-60">⌘Z</kbd>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={redo} disabled={!canRedo} aria-label="Redo">
                  <Redo2Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Redo <kbd className="ml-1 font-mono opacity-60">⇧⌘Z</kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        <div
          inert={!isDirty}
          aria-hidden={!isDirty}
          className={cn(
            "flex items-center gap-2 transition-all duration-200 ease-out",
            isDirty
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-2 pointer-events-none"
          )}
        >
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mr-1">
            <span className="size-1.5 rounded-full bg-status-warning" />
            Unsaved changes
          </span>
          <Button
            onClick={() => void handleDiscard()}
            disabled={isApplying}
            variant="ghost"
            size="sm"
          >
            Discard
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => void handleApply()}
                disabled={isApplying}
                variant="default"
                size="sm"
                className="min-w-[60px]"
              >
                {isApplying ? "Applying…" : "Apply"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Save and reload Kanata <kbd className="ml-1 font-mono opacity-60">⌘S</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
        <StatusIndicator />
      </div>
    </header>
  );
}
