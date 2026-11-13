import { useMemo, useState } from "react";
import { ChevronDownIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import {
  useConfigActions,
  useConfigState,
  useToast,
  useUIActions,
  useUIState,
} from "../../contexts";
import { cn } from "@/lib/utils";
import { aliasesReferencingLayer, referencesAlias, referencesLayer } from "@/kanata/key-action";
import type { KeyboardConfig } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function normalizeLayerName(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

function getLayerNameError(name: string, existing: string[], currentName?: string) {
  if (!name) return null;
  if (name !== currentName && existing.includes(name)) {
    return `A layer named “${name}” already exists.`;
  }
  return null;
}

function countReferences(config: KeyboardConfig | null, layerName: string) {
  if (!config) return 0;
  const aliases = aliasesReferencingLayer(config.aliases, layerName);
  return config.layers
    .filter((layer) => layer.name !== layerName)
    .reduce(
      (count, layer) =>
        count +
        Object.values(layer.keys).filter(
          (action) => referencesLayer(action, layerName) || referencesAlias(action, aliases),
        ).length,
      0,
    );
}

interface LayerNameInputProps {
  initialName: string;
  existingNames: string[];
  currentName?: string;
  placeholder?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function LayerNameInput({
  initialName,
  existingNames,
  currentName,
  placeholder,
  onSubmit,
  onCancel,
}: LayerNameInputProps) {
  const [value, setValue] = useState(initialName);
  const normalized = normalizeLayerName(value);
  const error = getLayerNameError(normalized, existingNames, currentName);

  const submit = () => {
    if (!normalized || error) {
      if (!normalized) onCancel();
      return;
    }
    onSubmit(normalized);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => (error || !normalized ? onCancel() : submit())}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        aria-label="Layer name"
        aria-invalid={Boolean(error)}
        spellCheck={false}
        className={cn(
          "w-24 rounded-md border bg-card px-2.5 py-1 font-mono text-[11px] text-foreground outline-none",
          error ? "border-status-error/60" : "border-white/20",
        )}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
      />
      {(error || (normalized && normalized !== value.trim())) && (
        <div
          role={error ? "alert" : undefined}
          className={cn(
            "absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[11px] shadow-md",
            error ? "border-status-error/30 text-status-error" : "border-border text-muted-foreground",
          )}
        >
          {error ?? (
            <>
              Will be saved as <span className="font-mono text-foreground">{normalized}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function LayerTabs() {
  const { config } = useConfigState();
  const { addLayer, removeLayer, renameLayer, getUndoDepth, undoFrom } = useConfigActions();
  const { activeLayer } = useUIState();
  const { setActiveLayer } = useUIActions();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [menuLayer, setMenuLayer] = useState<string | null>(null);
  const [layerToDelete, setLayerToDelete] = useState<string | null>(null);

  const layers = useMemo(() => config?.layers ?? [], [config]);
  const layerNames = layers.map((layer) => layer.name);
  const deleteReferenceCount = layerToDelete ? countReferences(config, layerToDelete) : 0;

  const handleRename = (oldName: string, newName: string) => {
    setEditingLayer(null);
    if (newName === oldName) return;
    setActiveLayer(renameLayer(oldName, newName, activeLayer));
  };

  const confirmDelete = () => {
    if (!layerToDelete) return;
    removeLayer(layerToDelete);
    if (activeLayer === layerToDelete) {
      setActiveLayer(layerNames.find((name) => name !== layerToDelete) ?? activeLayer);
    }
    const depth = getUndoDepth();
    showToast({
      tone: "info",
      title: `Deleted the “${layerToDelete}” layer`,
      action: {
        label: "Undo",
        onClick: () => {
          if (!undoFrom(depth)) showToast({ tone: "info", title: "Use ⌘Z to step back through your edits" });
        },
      },
    });
    setLayerToDelete(null);
  };

  return (
    <div className="flex items-center">
      <div role="tablist" aria-label="Layers" className="flex items-center rounded-lg bg-muted/50 p-0.5">
        {layers.map((layer, index) => {
          const isActive = activeLayer === layer.name;
          if (editingLayer === layer.name) {
            return (
              <LayerNameInput
                key={layer.name}
                initialName={layer.name}
                currentName={layer.name}
                existingNames={layerNames}
                onSubmit={(name) => handleRename(layer.name, name)}
                onCancel={() => setEditingLayer(null)}
              />
            );
          }
          return (
            <DropdownMenu
              key={layer.name}
              open={menuLayer === layer.name}
              onOpenChange={(open) => setMenuLayer(open ? layer.name : null)}
              modal={false}
            >
              <div
                className={cn(
                  "flex items-center rounded-md transition-all duration-150 ease-out",
                  isActive ? "bg-card shadow-sm" : "hover:bg-white/[0.03]",
                )}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setActiveLayer(layer.name);
                  setMenuLayer(layer.name);
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveLayer(layer.name)}
                  onDoubleClick={() => setEditingLayer(layer.name)}
                  className={cn(
                    "py-1 text-[11px] font-medium outline-none rounded-md focus-visible:ring-1 focus-visible:ring-white/40",
                    isActive ? "pl-3 pr-1 text-foreground" : "px-3 text-muted-foreground hover:text-foreground/80",
                  )}
                >
                  {layer.name}
                  {index === 0 && (
                    <span className="sr-only"> (base layer)</span>
                  )}
                </button>
                <DropdownMenuTrigger
                  aria-label={`Options for the ${layer.name} layer`}
                  className={cn(
                    "mr-1 rounded p-0.5 text-muted-foreground outline-none hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-1 focus-visible:ring-white/40",
                    !isActive && "hidden",
                  )}
                >
                  <ChevronDownIcon className="size-3" />
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align="start" className="w-44 p-1">
                <DropdownMenuItem onSelect={() => setEditingLayer(layer.name)}>
                  <PencilIcon className="size-3.5" />
                  Rename…
                </DropdownMenuItem>
                {layers.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setLayerToDelete(layer.name)}>
                      <TrashIcon className="size-3.5" />
                      Delete layer…
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>

      {isAdding ? (
        <div className="ml-2 animate-fade-in">
          <LayerNameInput
            initialName=""
            placeholder="layer name"
            existingNames={layerNames}
            onSubmit={(name) => {
              addLayer(name);
              setActiveLayer(name);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              aria-label="Add layer"
              className={cn(
                "ml-1.5 rounded-md p-1 outline-none",
                "text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-white/40",
                "hover:bg-muted/50 transition-all duration-150 ease-out",
                "active:scale-[0.92]",
              )}
            >
              <PlusIcon className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add layer</TooltipContent>
        </Tooltip>
      )}

      <AlertDialog
        open={layerToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setLayerToDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the “{layerToDelete}” layer?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteReferenceCount > 0
                ? `${deleteReferenceCount} ${deleteReferenceCount === 1 ? "key switches" : "keys switch"} to this layer. ${deleteReferenceCount === 1 ? "It" : "They"} will be reset to ${deleteReferenceCount === 1 ? "its" : "their"} default.`
                : "Its key mappings will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete layer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
