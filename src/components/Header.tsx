import { useState } from "react";
import { LayerTabs } from "./editor";
import { ProfileSwitcher, ImportExportButton } from "./profiles";
import { StatusIndicator } from "./status";
import { Button } from "./ui";
import { useConfigActions, useConfigState, useProfile } from "../contexts";
import { cn } from "@/lib/utils";

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

  return (
    <header className="h-12 glass border-b border-border flex items-center justify-between drag-region pl-20 pr-4 z-20">
      <div className="flex items-center gap-3 no-drag-region">
        <h1 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground/90">
          Mantle
        </h1>

        {hasProfiles && (
          <>
            <div className="h-3.5 w-px bg-border" />
            <ProfileSwitcher />
            <div className="h-3.5 w-px bg-border" />
            <LayerTabs />
          </>
        )}
      </div>

      <div className="flex items-center gap-2 no-drag-region">
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
