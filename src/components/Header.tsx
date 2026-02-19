import { useState, type MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LayerTabs } from "./editor";
import { ProfileSwitcher, ImportExportButton } from "./profiles";
import { StatusIndicator } from "./status";
import { Button } from "./ui";
import { useConfigActions, useConfigState, useProfile } from "../contexts";
import { cn } from "@/lib/utils";
import mantleLogo from "../../images/icon.png";

export function Header() {
  const { isDirty, hasProfiles } = useConfigState();
  const { applyChanges, discardChanges } = useConfigActions();
  const { refreshProfiles } = useProfile();
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await applyChanges(refreshProfiles);
    } finally {
      setIsApplying(false);
    }
  };

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
        <img
          src={mantleLogo}
          alt="Mantle"
          className="size-4 rounded-sm opacity-85"
        />

        {hasProfiles && (
          <>
            <div className="h-3.5 w-px bg-border/50" />
            <ProfileSwitcher />
            <div className="h-3.5 w-px bg-border/50" />
            <LayerTabs />
          </>
        )}
      </div>

      <div className="relative z-10 flex-1 h-full" />

      <div className="relative z-10 flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-2 transition-all duration-200 ease-out",
          isDirty
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-2 pointer-events-none"
        )}>
          <span className="text-[11px] text-muted-foreground mr-1">Unsaved</span>
          <Button
            onClick={discardChanges}
            disabled={isApplying}
            variant="ghost"
            size="sm"
          >
            Discard
          </Button>
          <Button
            onClick={handleApply}
            disabled={isApplying}
            variant="default"
            size="sm"
            className=""
          >
            {isApplying ? "Applying…" : "Apply"}
          </Button>
        </div>
        <ImportExportButton />
        <StatusIndicator />
      </div>
    </header>
  );
}
