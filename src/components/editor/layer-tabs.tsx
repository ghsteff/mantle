import { useState } from "react";
import { useConfig } from "../../contexts";
import { Button } from "../ui";
import { PlusIcon } from "lucide-react";

/**
 * Tabs for switching between keyboard layers.
 */
export function LayerTabs() {
  const {
    config,
    activeLayer,
    setActiveLayer,
    addLayer,
    removeLayer,
    renameLayer,
  } = useConfig();
  const [isAdding, setIsAdding] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const layers = config?.layers || [];

  const handleAddLayer = () => {
    const normalizedName = newLayerName.trim().toLowerCase().replace(/\s+/g, "-");
    if (normalizedName && !layers.find((l) => l.name === normalizedName)) {
      addLayer(normalizedName);
      setNewLayerName("");
      setIsAdding(false);
    }
  };

  const handleStartRename = (layerName: string) => {
    setEditingLayer(layerName);
    setEditName(layerName);
  };

  const handleRename = () => {
    if (editingLayer && editName.trim() && editName !== editingLayer) {
      renameLayer(
        editingLayer,
        editName.trim().toLowerCase().replace(/\s+/g, "-")
      );
    }
    setEditingLayer(null);
  };

  const handleDelete = (layerName: string) => {
    if (layers.length > 1 && confirm(`Delete layer "${layerName}"?`)) {
      removeLayer(layerName);
    }
  };

  return (
    <div className="flex items-center gap-1 px-2">
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
              className="px-3 py-1.5 bg-bg-tertiary border border-accent rounded text-sm
                         text-text-primary font-mono w-24 outline-none"
              autoFocus
            />
          ) : (
            <Button
              onClick={() => setActiveLayer(layer.name)}
              onDoubleClick={() => handleStartRename(layer.name)}
              variant={activeLayer === layer.name ? "default" : "outline"}
            >
              {layer.name}
            </Button>
          )}

          {/* Delete button - shown on hover if more than 1 layer */}
          {layers.length > 1 &&
            activeLayer === layer.name &&
            editingLayer !== layer.name && (
              <button
                type="button"
                onClick={() => handleDelete(layer.name)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-error
                         text-white text-xs flex items-center justify-center
                         opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete layer"
              >
                ×
              </button>
            )}
        </div>
      ))}

      {/* Add layer button */}
      {isAdding ? (
        <div className="flex items-center gap-1">
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
            className="px-2 py-1 bg-bg-tertiary border border-border rounded text-sm
                       text-text-primary font-mono w-24 outline-none
                       focus:border-accent"
            autoFocus
          />
          <Button onClick={handleAddLayer} variant="default">
            Add
          </Button>
          <Button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewLayerName("");
            }}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => setIsAdding(true)}
          variant="ghost"
          title="Add new layer"
          className="text-text-muted hover:text-text-primary"
        >
          <PlusIcon className="size-4" /> Add Layer
        </Button>
      )}
    </div>
  );
}
