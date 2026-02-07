import { useState } from "react";
import type { Preset } from "../../presets";
import { qwertyPreset, ALL_PRESETS } from "../../presets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { PlusIcon } from "lucide-react";

interface NewProfileDialogProps {
  onComplete: (profileName: string, preset: Preset) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

/**
 * Dialog for creating a new profile.
 * Preset selection is optional - defaults to QWERTY if none selected.
 */

export function NewProfileDialog({
  onComplete,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: NewProfileDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedPreset = selectedPresetId
    ? ALL_PRESETS.find((p) => p.metadata.id === selectedPresetId) || null
    : null;

  const handleCreate = async () => {
    if (profileName.trim()) {
      setIsCreating(true);
      try {
        // Use selected preset or default to QWERTY
        const presetToUse = selectedPreset || qwertyPreset;
        await onComplete(profileName.trim(), presetToUse);
        // Reset state
        setOpen?.(false);
        setSelectedPresetId(null);
        setProfileName("");
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen?.(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setSelectedPresetId(null);
      setProfileName("");
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" className="gap-1">
      <PlusIcon className="size-4" />
      New Profile
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Profile</DialogTitle>
          <DialogDescription>
            Enter a name for your profile. Optionally select a template below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Name Input */}
          <div className="space-y-2">
            <label
              htmlFor="new-profile-name"
              className="text-sm font-medium text-foreground"
            >
              Profile Name
            </label>
            <Input
              id="new-profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g., work, gaming, ergonomic"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && profileName.trim() && !isCreating) {
                  handleCreate();
                }
              }}
            />
          </div>

          {/* Optional Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Template (Optional)
            </label>
            <Select
              value={selectedPresetId || "none"}
              onValueChange={(value) =>
                setSelectedPresetId(value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  None (<span className="font-mono">QWERTY</span> default)
                </SelectItem>
                {ALL_PRESETS.map((preset) => (
                  <SelectItem
                    key={preset.metadata.id}
                    value={preset.metadata.id}
                  >
                    {preset.metadata.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground font-normal">
              {selectedPreset && selectedPreset.metadata.description}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen?.(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!profileName.trim() || isCreating}
            className="min-w-24"
          >
            {isCreating ? "Creating..." : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
