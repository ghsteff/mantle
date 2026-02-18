import { memo, useCallback, type MouseEvent } from "react";
import { CheckIcon, PencilIcon, TrashIcon } from "lucide-react";
import { CommandItem } from "../ui/command";

interface ProfileListItemProps {
  name: string;
  isActive: boolean;
  canDelete: boolean;
  onSelect: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
}

export const ProfileListItem = memo(function ProfileListItem({
  name,
  isActive,
  canDelete,
  onSelect,
  onRename,
  onDelete,
}: ProfileListItemProps) {
  const handleSelect = useCallback(() => {
    onSelect(name);
  }, [name, onSelect]);

  const handleRename = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onRename(name);
    },
    [name, onRename]
  );

  const handleDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onDelete(name);
    },
    [name, onDelete]
  );

  return (
    <CommandItem value={name} onSelect={handleSelect} className="justify-between">
      <span className="flex items-center gap-2">
        <CheckIcon className={`size-3 ${isActive ? "opacity-100" : "opacity-0"}`} />
        <span className={isActive ? "font-medium" : ""}>{name}</span>
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleRename}
          className="p-1 hover:bg-muted rounded"
          title="Rename profile"
        >
          <PencilIcon className="size-3" />
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 hover:bg-destructive/20 rounded text-destructive"
            title="Delete profile"
          >
            <TrashIcon className="size-3" />
          </button>
        )}
      </span>
    </CommandItem>
  );
});
