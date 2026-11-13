import { useRef, useState, type SyntheticEvent } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { useConfigState, useProfile } from "../../contexts";
import { Button } from "../ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  findProfileNameConflict,
  getProfileNameError,
  suggestDuplicateProfileName,
} from "@/lib/profile-name";

interface DuplicateProfileDialogProps {
  sourceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status = "editing" | "duplicating" | "failed" | "created";

const MESSAGE_ID = "duplicate-profile-message";
const WARNING_ID = "duplicate-profile-warning";

/** Mount with a fresh `key` each time it opens; it reads profile state once on mount. */
export function DuplicateProfileDialog({
  sourceName,
  open,
  onOpenChange,
}: DuplicateProfileDialogProps) {
  const configState = useConfigState();
  const { duplicateProfile } = useProfile();
  // Read once: a successful duplicate changes the profile list, active profile
  // and dirty flag while the dialog is still animating closed, which would
  // otherwise flash a name conflict and the discard warning.
  const [{ profileNames, activeProfile, isDirty, suggestion }] = useState(
    () => {
      const names = configState.profiles.map((profile) => profile.name);
      return {
        profileNames: names,
        activeProfile: configState.activeProfile,
        isDirty: configState.isDirty,
        suggestion: suggestDuplicateProfileName(sourceName, names),
      };
    },
  );
  const [name, setName] = useState(suggestion.name);
  const [status, setStatus] = useState<Status>("editing");
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
  const conflict = findProfileNameConflict(trimmedName, profileNames);
  const nameError = trimmedName
    ? (getProfileNameError(trimmedName) ??
      (conflict ? `A profile named “${conflict}” already exists.` : null))
    : null;
  const isDuplicating = status === "duplicating";
  const isCreated = status === "created";
  const canSubmit =
    Boolean(trimmedName) &&
    !nameError &&
    !isDuplicating &&
    !isCreated;

  const isForkingActiveProfile = sourceName === activeProfile;
  const carriesUnsavedChanges = isForkingActiveProfile && isDirty;
  const discardsUnsavedChanges =
    !isForkingActiveProfile && isDirty && !isCreated;

  const message =
    nameError ??
    (status === "failed"
      ? `Couldn’t duplicate “${sourceName}”. Try again.`
      : isCreated
        ? `Created “${trimmedName}”, but couldn’t switch to it. Choose it from the profile menu.`
        : null);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("duplicating");
    const result = await duplicateProfile(sourceName, trimmedName);
    if (result === "switched") {
      onOpenChange(false);
    } else {
      setStatus(result);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDuplicating) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={!isDuplicating}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const input = inputRef.current;
          if (!input) return;
          input.focus();
          input.setSelectionRange(
            suggestion.suffixStart,
            suggestion.name.length,
          );
        }}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Duplicate Profile</DialogTitle>
            <DialogDescription>
              {carriesUnsavedChanges
                ? `Start a new profile from “${sourceName}”. Your unsaved changes move to the copy, and “${sourceName}” keeps its last applied version.`
                : `Start a new profile from “${sourceName}”. You’ll switch to the copy, and “${sourceName}” stays as it is.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="duplicate-profile-name">Name</Label>
            <Input
              ref={inputRef}
              id="duplicate-profile-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (status === "failed") setStatus("editing");
              }}
              readOnly={isDuplicating || isCreated}
              placeholder="e.g., colemak-gaming"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={Boolean(nameError)}
              aria-describedby={
                [message && MESSAGE_ID, discardsUnsavedChanges && WARNING_ID]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
            />
            {message && (
              <p
                id={MESSAGE_ID}
                className={
                  isCreated
                    ? "text-xs text-status-warning"
                    : "text-xs text-status-error"
                }
              >
                {message}
              </p>
            )}
          </div>

          {discardsUnsavedChanges && (
            <p
              id={WARNING_ID}
              className="flex items-start gap-2 rounded-sm bg-status-warning-bg px-2.5 py-2 text-xs text-status-warning"
            >
              <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
              {`Switching to the copy discards your unsaved changes to “${activeProfile}”.`}
            </p>
          )}

          <DialogFooter>
            {isCreated ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isDuplicating}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {isDuplicating ? "Duplicating…" : "Duplicate"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
