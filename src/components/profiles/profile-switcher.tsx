import { useCallback, useState } from "react";
import { useConfigState, useProfile } from "../../contexts";
import { Button } from "../ui";
import { NewProfileDialog } from "../presets/new-profile-dialog";
import type { Preset } from "../../presets";
import { ProfileListItem } from "./profile-list-item";
import { DuplicateProfileDialog } from "./duplicate-profile-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import {
  ChevronsUpDown,
  FileInputIcon,
  PlusIcon,
} from "lucide-react";
import { getProfileNameError } from "@/lib/profile-name";
import { useKbdFileActions } from "./use-kbd-file-actions";

export function ProfileSwitcher() {
  const { profiles, activeProfile } = useConfigState();
  const { switchProfile, deleteProfile, renameProfile, createProfile } = useProfile();

  const [newProfileDialogOpen, setNewProfileDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<string | null>(null);
  const [duplicateDialogKey, setDuplicateDialogKey] = useState(0);
  const [targetProfile, setTargetProfile] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const newNameError = getProfileNameError(newName);
  const kbdFileActions = useKbdFileActions();

  const handleRenameClick = useCallback((name: string) => {
    setTargetProfile(name);
    setNewName(name);
    setRenameDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((name: string) => {
    setTargetProfile(name);
    setDeleteDialogOpen(true);
  }, []);

  const handleRename = useCallback(async () => {
    if (targetProfile && !newNameError && newName.trim() !== targetProfile) {
      await renameProfile(targetProfile, newName);
    }
    setRenameDialogOpen(false);
    setTargetProfile(null);
    setNewName("");
  }, [newName, newNameError, renameProfile, targetProfile]);

  const handleDelete = useCallback(async () => {
    if (targetProfile) {
      await deleteProfile(targetProfile);
    }
    setDeleteDialogOpen(false);
    setTargetProfile(null);
  }, [deleteProfile, targetProfile]);

  const handleCreateProfile = useCallback(
    async (name: string, preset: Preset) => {
      await createProfile(name, preset.config);
    },
    [createProfile]
  );

  const handleSelectProfile = useCallback(
    (name: string) => {
      switchProfile(name);
      setOpen(false);
    },
    [switchProfile]
  );

  const handleItemRename = useCallback(
    (name: string) => {
      handleRenameClick(name);
      setOpen(false);
    },
    [handleRenameClick]
  );

  const handleItemDuplicate = useCallback((name: string) => {
    setDuplicateSource(name);
    setDuplicateDialogKey((key) => key + 1);
    setDuplicateDialogOpen(true);
    setOpen(false);
  }, []);

  const handleItemExport = useCallback(
    (name: string) => {
      setOpen(false);
      kbdFileActions.startExport(name);
    },
    [kbdFileActions]
  );

  const handleItemDelete = useCallback(
    (name: string) => {
      handleDeleteClick(name);
      setOpen(false);
    },
    [handleDeleteClick]
  );

  if (profiles.length === 0) {
    return null;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="gap-1.5 font-medium justify-between text-[12px] h-7 px-2"
          >
            <span className="text-foreground/80">{activeProfile || "Select Profile"}</span>
            <ChevronsUpDown className="size-3 opacity-40" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search profiles…" />
            <CommandList>
              <CommandEmpty>No profiles found.</CommandEmpty>
              <CommandGroup heading="Profiles">
                {profiles.map((profile) => (
                  <ProfileListItem
                    key={profile.name}
                    name={profile.name}
                    isActive={profile.name === activeProfile}
                    canDelete={profiles.length > 1}
                    onSelect={handleSelectProfile}
                    onRename={handleItemRename}
                    onDuplicate={handleItemDuplicate}
                    onExport={handleItemExport}
                    onDelete={handleItemDelete}
                  />
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setNewProfileDialogOpen(true);
                    setOpen(false);
                  }}
                >
                  <PlusIcon className="size-3.5" />
                  New Profile…
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    kbdFileActions.startImport();
                  }}
                >
                  <FileInputIcon className="size-3.5" />
                  Import .kbd File…
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Profile</DialogTitle>
            <DialogDescription>
              Enter a new name for "{targetProfile}".
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Profile name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            autoFocus
          />
          {newNameError && (
            <p className="text-xs text-status-error">{newNameError}</p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={Boolean(newNameError) || newName.trim() === targetProfile}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{targetProfile}"?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewProfileDialog
        open={newProfileDialogOpen}
        onOpenChange={setNewProfileDialogOpen}
        onComplete={handleCreateProfile}
        trigger={null}
      />

      {duplicateSource && (
        <DuplicateProfileDialog
          key={duplicateDialogKey}
          sourceName={duplicateSource}
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
        />
      )}

      {kbdFileActions.dialogs}
    </>
  );
}
