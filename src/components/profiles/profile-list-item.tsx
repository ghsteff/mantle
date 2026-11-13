import { memo, useRef, useState, type SyntheticEvent } from "react";
import {
  CheckIcon,
  CopyIcon,
  FileOutputIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandItem } from "../ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ProfileListItemProps {
  name: string;
  isActive: boolean;
  canDelete: boolean;
  onSelect: (name: string) => void;
  onRename: (name: string) => void;
  onDuplicate: (name: string) => void;
  onExport: (name: string) => void;
  onDelete: (name: string) => void;
}

// The actions menu is a React child of the cmdk item, so its clicks and key
// presses would otherwise bubble up and select (switch to) the profile.
const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();

export const ProfileListItem = memo(function ProfileListItem({
  name,
  isActive,
  canDelete,
  onSelect,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}: ProfileListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const didChooseActionRef = useRef(false);

  const chooseAction = (action: (name: string) => void) => () => {
    didChooseActionRef.current = true;
    action(name);
  };

  return (
    <CommandItem
      value={name}
      onSelect={() => onSelect(name)}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuOpen(true);
      }}
      className="group justify-between pr-1"
    >
      <span className="flex min-w-0 items-center gap-2">
        <CheckIcon className={cn("size-3", isActive ? "opacity-100" : "opacity-0")} />
        <span className={cn("truncate", isActive && "font-medium")}>{name}</span>
      </span>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <DropdownMenuTrigger
          className={cn(
            "rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-foreground focus-visible:opacity-100",
            "group-data-[selected=true]:opacity-100 data-[state=open]:bg-white/[0.08] data-[state=open]:opacity-100"
          )}
          aria-label={`Actions for ${name}`}
          onClick={stopPropagation}
          onKeyDown={stopPropagation}
        >
          <MoreHorizontalIcon className="size-3.5 text-current" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={10}
          className="w-44 p-1"
          onClick={stopPropagation}
          onKeyDown={stopPropagation}
          onCloseAutoFocus={(event) => {
            // The chosen action closes the profile menu and opens a dialog,
            // which takes focus itself.
            if (didChooseActionRef.current) event.preventDefault();
            didChooseActionRef.current = false;
          }}
        >
          <DropdownMenuItem onSelect={chooseAction(onRename)}>
            <PencilIcon className="size-3.5" />
            Rename…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={chooseAction(onDuplicate)}>
            <CopyIcon className="size-3.5" />
            Duplicate…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={chooseAction(onExport)}>
            <FileOutputIcon className="size-3.5" />
            Export as .kbd…
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={chooseAction(onDelete)}>
                <TrashIcon className="size-3.5" />
                Delete…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </CommandItem>
  );
});
