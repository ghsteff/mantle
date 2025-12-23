import { useState, useEffect } from "react";
import { getKeyLabel } from "../keyboard/layout";

type ActionType = "simple" | "tap-hold" | "layer";

interface ActionEditorProps {
  keyId: string;
  currentAction: string;
  onSave: (action: string) => void;
  layers: string[];
}

/**
 * Editor for configuring key actions.
 */
export function ActionEditor({ keyId, currentAction, onSave, layers }: ActionEditorProps) {
  const [actionType, setActionType] = useState<ActionType>("simple");
  const [simpleKey, setSimpleKey] = useState(keyId);
  const [tapKey, setTapKey] = useState(keyId);
  const [holdKey, setHoldKey] = useState("lctl");
  const [timeout, setTimeout] = useState(200);
  const [layerName, setLayerName] = useState(layers[0] || "");
  const [layerMode, setLayerMode] = useState<"momentary" | "toggle" | "one-shot">("momentary");

  // Parse current action on mount
  useEffect(() => {
    if (currentAction === "_" || currentAction === keyId) {
      setActionType("simple");
      setSimpleKey(currentAction);
      return;
    }

    // Try to parse tap-hold: (tap-hold 200 200 esc lctl)
    const tapHoldMatch = currentAction.match(/\(tap-hold\s+(\d+)\s+\d+\s+(\S+)\s+(\S+)\)/);
    if (tapHoldMatch) {
      setActionType("tap-hold");
      setTimeout(parseInt(tapHoldMatch[1]));
      setTapKey(tapHoldMatch[2]);
      setHoldKey(tapHoldMatch[3]);
      return;
    }

    // Try to parse layer actions
    const layerHeldMatch = currentAction.match(/\(layer-while-held\s+(\S+)\)/);
    if (layerHeldMatch) {
      setActionType("layer");
      setLayerName(layerHeldMatch[1]);
      setLayerMode("momentary");
      return;
    }

    const layerToggleMatch = currentAction.match(/\(layer-toggle\s+(\S+)\)/);
    if (layerToggleMatch) {
      setActionType("layer");
      setLayerName(layerToggleMatch[1]);
      setLayerMode("toggle");
      return;
    }

    // Default: treat as simple key
    setActionType("simple");
    setSimpleKey(currentAction);
  }, [currentAction, keyId]);

  const handleSave = () => {
    let action: string;

    switch (actionType) {
      case "simple":
        action = simpleKey;
        break;
      case "tap-hold":
        action = `(tap-hold ${timeout} ${timeout} ${tapKey} ${holdKey})`;
        break;
      case "layer":
        switch (layerMode) {
          case "momentary":
            action = `(layer-while-held ${layerName})`;
            break;
          case "toggle":
            action = `(layer-toggle ${layerName})`;
            break;
          case "one-shot":
            action = `(one-shot ${layerName})`;
            break;
        }
        break;
    }

    onSave(action);
  };

  const { label } = getKeyLabel(keyId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-border">
        <div className="text-text-muted text-xs uppercase tracking-wide mb-1">
          Editing Key
        </div>
        <div className="text-lg font-mono font-semibold text-text-bright">
          {label}
          <span className="text-text-muted text-sm ml-2">({keyId})</span>
        </div>
      </div>

      {/* Action Type Selector */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm">Action Type</label>
        <div className="flex gap-2">
          {(["simple", "tap-hold", "layer"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActionType(type)}
              className={`
                px-3 py-1.5 rounded text-sm capitalize
                ${actionType === type
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                }
              `}
            >
              {type === "tap-hold" ? "Tap-Hold" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Action-specific editors */}
      <div className="space-y-3 pt-2">
        {actionType === "simple" && (
          <div className="space-y-2">
            <label className="text-text-secondary text-sm">Key Output</label>
            <input
              type="text"
              value={simpleKey}
              onChange={(e) => setSimpleKey(e.target.value.toLowerCase())}
              placeholder="Key name (e.g., a, esc, lctl)"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                         text-text-primary font-mono text-sm
                         focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
            <div className="text-text-muted text-xs">
              Use <code className="bg-bg-hover px-1 rounded">_</code> for transparent (inherit from lower layer)
            </div>
          </div>
        )}

        {actionType === "tap-hold" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-text-secondary text-sm">Tap Key</label>
                <input
                  type="text"
                  value={tapKey}
                  onChange={(e) => setTapKey(e.target.value.toLowerCase())}
                  placeholder="e.g., esc"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                             text-text-primary font-mono text-sm
                             focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-text-secondary text-sm">Hold Key</label>
                <input
                  type="text"
                  value={holdKey}
                  onChange={(e) => setHoldKey(e.target.value.toLowerCase())}
                  placeholder="e.g., lctl"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                             text-text-primary font-mono text-sm
                             focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-text-secondary text-sm">
                Timeout: {timeout}ms
              </label>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={timeout}
                onChange={(e) => setTimeout(parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </>
        )}

        {actionType === "layer" && (
          <>
            <div className="space-y-2">
              <label className="text-text-secondary text-sm">Target Layer</label>
              <select
                value={layerName}
                onChange={(e) => setLayerName(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                           text-text-primary text-sm
                           focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              >
                {layers.map((layer) => (
                  <option key={layer} value={layer}>
                    {layer}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-text-secondary text-sm">Activation Mode</label>
              <div className="flex gap-2">
                {(["momentary", "toggle", "one-shot"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLayerMode(mode)}
                    className={`
                      px-3 py-1.5 rounded text-sm capitalize
                      ${layerMode === mode
                        ? "bg-accent text-white"
                        : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                      }
                    `}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="text-text-muted text-xs">
                {layerMode === "momentary" && "Layer active while key is held"}
                {layerMode === "toggle" && "Toggle layer on/off with each press"}
                {layerMode === "one-shot" && "Layer active for next keypress only"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Save button */}
      <div className="pt-4 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          className="w-full px-4 py-2 bg-accent hover:bg-accent-hover
                     text-white rounded font-medium transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

