import { useCallback, useState } from "react";
import {
  useConfigActions,
  useConfigState,
  useUIActions,
  useUIState,
} from "../../contexts";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LayerTabs() {
  const { config } = useConfigState();
  const { addLayer, removeLayer, renameLayer } = useConfigActions();
  const { activeLayer } = useUIState();
  const { setActiveLayer } = useUIActions();
  const [isAdding, setIsAdding] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const layers = config?.layers || [];

  const handleAddLayer = useCallback(() => {
    const normalizedName = newLayerName.trim().toLowerCase().replace(/\s+/g, "-");
    if (normalizedName && !layers.find((l) => l.name === normalizedName)) {
      addLayer(normalizedName);
      setActiveLayer(normalizedName);
      setNewLayerName("");
      setIsAdding(false);
    }
  }, [addLayer, layers, newLayerName, setActiveLayer]);

  const handleStartRename = useCallback((layerName: string) => {
    setEditingLayer(layerName);
    setEditName(layerName);
  }, []);

  const handleRename = useCallback(() => {
    if (editingLayer && editName.trim() && editName !== editingLayer) {
      const newName = editName.trim().toLowerCase().replace(/\s+/g, "-");
      const newActiveLayer = renameLayer(editingLayer, newName, activeLayer);
      setActiveLayer(newActiveLayer);
    }
    setEditingLayer(null);
  }, [activeLayer, editName, editingLayer, renameLayer, setActiveLayer]);

  const handleDelete = useCallback(
    (layerName: string) => {
      if (layers.length > 1 && confirm(`Delete layer "${layerName}"?`)) {
        removeLayer(layerName, activeLayer);
        if (activeLayer === layerName && layers.length > 1) {
          const remaining = layers.filter((l) => l.name !== layerName);
          if (remaining.length > 0) {
            setActiveLayer(remaining[0].name);
          }
        }
      }
    },
    [activeLayer, layers, removeLayer, setActiveLayer]
  );

  return (
    <div className="flex items-center">
      {/* Segmented pill container */}
      <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
        {layers.map((layer) => (
          <div key={layer.name} className="group relative">
            {editingLayer === layer.name ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setEditingLayer(null);
                }}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-mono w-20",
                  "bg-card border border-accent/50 text-foreground outline-none",
                )}
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveLayer(layer.name)}
                onDoubleClick={() => handleStartRename(layer.name)}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-medium",
                  "transition-all duration-150 ease-out",
                  activeLayer === layer.name
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                {layer.name}
              </button>
            )}

            {layers.length > 1 &&
              activeLayer === layer.name &&
              editingLayer !== layer.name && (
                <button
                  type="button"
                  onClick={() => handleDelete(layer.name)}
                  className={cn(
                    "absolute -top-1 -right-1 size-3.5 rounded-full",
                    "bg-destructive/80 text-white text-[9px]",
                    "flex items-center justify-center",
                    "opacity-0 group-hover:opacity-100",
                    "transition-opacity duration-150 ease-out",
                  )}
                  title="Delete layer"
                >
                  ×
                </button>
              )}
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="flex items-center gap-1 ml-2 animate-fade-in">
          <input
            type="text"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddLayer();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewLayerName("");
              }
            }}
            placeholder="layer-name"
            className={cn(
              "px-2 py-1 rounded-md text-[11px] font-mono w-20",
              "bg-muted/50 border border-border text-foreground outline-none",
              "focus:border-accent/50 transition-colors duration-150",
            )}
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddLayer}
            className="px-2 py-1 rounded-md text-[11px] font-medium bg-card text-foreground shadow-sm transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewLayerName("");
            }}
            className="px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          title="Add new layer"
          className={cn(
            "ml-1.5 p-1 rounded-md",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted/50 transition-all duration-150 ease-out",
            "active:scale-[0.92]",
          )}
        >
          <PlusIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
