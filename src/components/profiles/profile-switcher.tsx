import { useCallback, useState } from "react";
import { useConfigState, useProfile } from "../../contexts";
import { Button } from "../ui";
import { NewProfileDialog } from "../presets/new-profile-dialog";
import type { Preset } from "../../presets";
import { ProfileListItem } from "./profile-list-item";
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
  PlusIcon,
} from "lucide-react";

/**
 * Dropdown to switch between saved profiles.
 */
export function ProfileSwitcher() {
  const { profiles, activeProfile } = useConfigState();
  const { switchProfile, deleteProfile, renameProfile, createProfile } = useProfile();

  const [newProfileDialogOpen, setNewProfileDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetProfile, setTargetProfile] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

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
    if (targetProfile && newName.trim() && newName !== targetProfile) {
      await renameProfile(targetProfile, newName.trim());
    }
    setRenameDialogOpen(false);
    setTargetProfile(null);
    setNewName("");
  }, [newName, renameProfile, targetProfile]);

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
            className="gap-1 font-medium justify-between"
          >
            {activeProfile || "Select Profile"}
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search profiles..." />
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
                  <PlusIcon className="size-4" />
                  Add New Profile
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Profile</DialogTitle>
            <DialogDescription>
              Enter a new name for the profile "{targetProfile}".
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the profile "{targetProfile}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
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

      {/* New Profile Dialog */}
      <NewProfileDialog
        open={newProfileDialogOpen}
        onOpenChange={setNewProfileDialogOpen}
        onComplete={handleCreateProfile}
        trigger={null}
      />
    </>
  );
}
