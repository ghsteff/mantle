import { useState } from "react";
import { LayerTabs } from "./editor";
import { ProfileSwitcher, ImportExportButton } from "./profiles";
import { StatusIndicator } from "./status";
import { Button } from "./ui";
import { useConfig, useProfile } from "../contexts";

/**
 * Header with layer tabs, apply changes button, and status indicator.
 */
export function Header() {
  const { isDirty, applyChanges, discardChanges, hasProfiles } = useConfig();
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
    <header
      className="h-12 bg-bg-secondary border-b border-border flex items-center justify-between drag-region pl-20 pr-4"
    >
      <div className="flex items-center gap-4 no-drag-region">
        <h1 className="text-sm font-semibold text-text-primary">Mantle</h1>
        {hasProfiles && (
          <>
            <ProfileSwitcher />
            <div className="h-4 w-px bg-border" />
            <LayerTabs />
          </>
        )}
      </div>
      <div className="flex items-center gap-3 no-drag-region"
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
