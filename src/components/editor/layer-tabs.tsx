import { useState } from "react";
import { useConfig, useUI } from "../../contexts";
import { PlusIcon } from "lucide-react";

/**
 * Tabs for switching between keyboard layers.
 */
export function LayerTabs() {
  const { config, addLayer, removeLayer, renameLayer } = useConfig();
  const { activeLayer, setActiveLayer } = useUI();
  const [isAdding, setIsAdding] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const layers = config?.layers || [];

  const handleAddLayer = () => {
    const normalizedName = newLayerName.trim().toLowerCase().replace(/\s+/g, "-");
    if (normalizedName && !layers.find((l) => l.name === normalizedName)) {
      addLayer(normalizedName);
      setActiveLayer(normalizedName);
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
      const newName = editName.trim().toLowerCase().replace(/\s+/g, "-");
      const newActiveLayer = renameLayer(editingLayer, newName, activeLayer);
      setActiveLayer(newActiveLayer);
    }
    setEditingLayer(null);
  };

  const handleDelete = (layerName: string) => {
    if (layers.length > 1 && confirm(`Delete layer "${layerName}"?`)) {
      removeLayer(layerName, activeLayer);
      // Switch to first layer if we deleted the active one
      if (activeLayer === layerName && layers.length > 1) {
        const remaining = layers.filter((l) => l.name !== layerName);
        if (remaining.length > 0) {
          setActiveLayer(remaining[0].name);
        }
      }
    }
  };

  return (
    <div className="flex items-center px-2">
      {/* Segmented control container */}
      <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border">
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
                className="px-3 py-1 bg-secondary border border-primary rounded-sm text-xs
                           text-foreground font-mono w-24 outline-none"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveLayer(layer.name)}
                onDoubleClick={() => handleStartRename(layer.name)}
                className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                  activeLayer === layer.name
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {layer.name}
              </button>
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
      </div>

      {/* Add layer button - outside the segmented container */}
      {isAdding ? (
        <div className="flex items-center gap-1 ml-2">
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
            className="px-2 py-1 bg-secondary border border-border rounded text-sm
                       text-foreground font-mono w-24 outline-none
                       focus:border-primary"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddLayer}
            className="px-2 py-1 rounded-sm text-xs font-medium bg-card text-foreground shadow-sm transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewLayerName("");
            }}
            className="px-2 py-1 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          title="Add new layer"
          className="ml-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <PlusIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
