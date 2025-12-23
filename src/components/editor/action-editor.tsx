import { useState, useEffect } from "react";
import { getKeyLabel } from "../keyboard/layout";
import { KeyCombobox } from "./key-combobox";
import { MultiKeyPicker } from "./multi-key-picker";

type ActionType = "simple" | "tap-hold" | "layer";
type KeyType = "key" | "multi";
type HoldType = "key" | "multi" | "layer";

interface ActionEditorProps {
  keyId: string;
  currentAction: string;
  onSave: (action: string) => void;
  layers: string[];
}

/**
 * Check if a value is a multi expression
 */
function isMultiExpression(value: string): boolean {
  return value.startsWith("(multi ");
}

/**
 * Editor for configuring key actions.
 */
export function ActionEditor({
  keyId,
  currentAction,
  onSave,
  layers,
}: ActionEditorProps) {
  const [actionType, setActionType] = useState<ActionType>("simple");

  // Simple action state
  const [simpleKeyType, setSimpleKeyType] = useState<KeyType>("key");
  const [simpleKey, setSimpleKey] = useState(keyId);
  const [simpleMultiKeys, setSimpleMultiKeys] = useState("(multi lctl c)");

  // Tap-hold state
  const [tapKeyType, setTapKeyType] = useState<KeyType>("key");
  const [tapKey, setTapKey] = useState(keyId);
  const [tapMultiKeys, setTapMultiKeys] = useState("(multi lctl c)");

  const [holdType, setHoldType] = useState<HoldType>("key");
  const [holdKey, setHoldKey] = useState("lctl");
  const [holdMultiKeys, setHoldMultiKeys] = useState("(multi lctl lsft lalt)");
  const [holdLayer, setHoldLayer] = useState(layers[1] || layers[0] || "");
  const [holdLayerMode, setHoldLayerMode] = useState<"momentary" | "toggle">(
    "momentary"
  );
  const [timeout, setTimeout] = useState(200);

  // Layer action state
  const [layerName, setLayerName] = useState(layers[0] || "");
  const [layerMode, setLayerMode] = useState<
    "momentary" | "toggle" | "one-shot"
  >("momentary");

  // Parse current action on mount
  useEffect(() => {
    if (currentAction === "_" || currentAction === keyId) {
      setActionType("simple");
      setSimpleKeyType("key");
      setSimpleKey(currentAction);
      return;
    }

    // Check if it's a simple multi expression (not inside tap-hold)
    if (
      isMultiExpression(currentAction) &&
      !currentAction.includes("tap-hold")
    ) {
      setActionType("simple");
      setSimpleKeyType("multi");
      setSimpleMultiKeys(currentAction);
      return;
    }

    // Try to parse tap-hold with layer: (tap-hold 200 200 spc (layer-while-held nav))
    const tapHoldLayerMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+\(layer-while-held\s+(\S+)\)\)/
    );
    if (tapHoldLayerMatch) {
      setActionType("tap-hold");
      setTimeout(parseInt(tapHoldLayerMatch[1]));
      const tapValue = tapHoldLayerMatch[2];
      if (isMultiExpression(tapValue)) {
        setTapKeyType("multi");
        setTapMultiKeys(tapValue);
      } else {
        setTapKeyType("key");
        setTapKey(tapValue);
      }
      setHoldType("layer");
      setHoldLayer(tapHoldLayerMatch[3]);
      setHoldLayerMode("momentary");
      return;
    }

    // Try to parse tap-hold with layer-toggle: (tap-hold 200 200 spc (layer-toggle nav))
    const tapHoldToggleMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+\(layer-toggle\s+(\S+)\)\)/
    );
    if (tapHoldToggleMatch) {
      setActionType("tap-hold");
      setTimeout(parseInt(tapHoldToggleMatch[1]));
      const tapValue = tapHoldToggleMatch[2];
      if (isMultiExpression(tapValue)) {
        setTapKeyType("multi");
        setTapMultiKeys(tapValue);
      } else {
        setTapKeyType("key");
        setTapKey(tapValue);
      }
      setHoldType("layer");
      setHoldLayer(tapHoldToggleMatch[3]);
      setHoldLayerMode("toggle");
      return;
    }

    // Try to parse tap-hold with multi hold: (tap-hold 200 200 esc (multi lctl lsft lalt))
    const tapHoldMultiMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+(\(multi\s+[^)]+\))\)/
    );
    if (tapHoldMultiMatch) {
      setActionType("tap-hold");
      setTimeout(parseInt(tapHoldMultiMatch[1]));
      const tapValue = tapHoldMultiMatch[2];
      if (isMultiExpression(tapValue)) {
        setTapKeyType("multi");
        setTapMultiKeys(tapValue);
      } else {
        setTapKeyType("key");
        setTapKey(tapValue);
      }
      setHoldType("multi");
      setHoldMultiKeys(tapHoldMultiMatch[3]);
      return;
    }

    // Try to parse simple tap-hold: (tap-hold 200 200 esc lctl)
    const tapHoldMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+(\S+)\)/
    );
    if (tapHoldMatch) {
      setActionType("tap-hold");
      setTimeout(parseInt(tapHoldMatch[1]));
      const tapValue = tapHoldMatch[2];
      if (isMultiExpression(tapValue)) {
        setTapKeyType("multi");
        setTapMultiKeys(tapValue);
      } else {
        setTapKeyType("key");
        setTapKey(tapValue);
      }
      setHoldType("key");
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
    setSimpleKeyType("key");
    setSimpleKey(currentAction);
  }, [currentAction, keyId]);

  const handleSave = () => {
    let action: string;

    switch (actionType) {
      case "simple":
        action = simpleKeyType === "key" ? simpleKey : simpleMultiKeys;
        break;
      case "tap-hold": {
        const tapValue = tapKeyType === "key" ? tapKey : tapMultiKeys;

        if (holdType === "key") {
          action = `(tap-hold ${timeout} ${timeout} ${tapValue} ${holdKey})`;
        } else if (holdType === "multi") {
          action = `(tap-hold ${timeout} ${timeout} ${tapValue} ${holdMultiKeys})`;
        } else {
          const layerAction =
            holdLayerMode === "momentary"
              ? `(layer-while-held ${holdLayer})`
              : `(layer-toggle ${holdLayer})`;
          action = `(tap-hold ${timeout} ${timeout} ${tapValue} ${layerAction})`;
        }
        break;
      }
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

  // Reusable key type toggle component
  const KeyTypeToggle = ({
    value,
    onChange,
  }: {
    value: KeyType;
    onChange: (type: KeyType) => void;
  }) => (
    <div className="flex gap-1 mb-2">
      {(["key", "multi"] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`
            px-2 py-1 rounded text-xs
            ${
              value === type
                ? "bg-accent text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }
          `}
        >
          {type === "multi" ? "Multi-Key" : "Single Key"}
        </button>
      ))}
    </div>
  );

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
                ${
                  actionType === type
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
            <KeyTypeToggle value={simpleKeyType} onChange={setSimpleKeyType} />

            {simpleKeyType === "key" ? (
              <KeyCombobox
                value={simpleKey}
                onChange={setSimpleKey}
                placeholder="Select key..."
              />
            ) : (
              <MultiKeyPicker
                value={simpleMultiKeys}
                onChange={setSimpleMultiKeys}
              />
            )}

            <div className="text-text-muted text-xs">
              {simpleKeyType === "key" ? (
                <>
                  Use <code className="bg-bg-hover px-1 rounded">_</code> for
                  transparent (inherit from lower layer)
                </>
              ) : (
                "Outputs multiple keys simultaneously (e.g., Ctrl+C)"
              )}
            </div>
          </div>
        )}

        {actionType === "tap-hold" && (
          <>
            {/* Tap Action */}
            <div className="space-y-2">
              <label className="text-text-secondary text-sm">Tap Action</label>
              <KeyTypeToggle value={tapKeyType} onChange={setTapKeyType} />

              {tapKeyType === "key" ? (
                <KeyCombobox
                  value={tapKey}
                  onChange={setTapKey}
                  placeholder="Key when tapped..."
                />
              ) : (
                <MultiKeyPicker
                  value={tapMultiKeys}
                  onChange={setTapMultiKeys}
                />
              )}
            </div>

            {/* Hold Action */}
            <div className="space-y-2">
              <label className="text-text-secondary text-sm">Hold Action</label>
              <div className="flex gap-1 mb-2">
                {(["key", "multi", "layer"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setHoldType(type)}
                    className={`
                      px-2 py-1 rounded text-xs capitalize
                      ${
                        holdType === type
                          ? "bg-accent text-white"
                          : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                      }
                    `}
                  >
                    {type === "multi" ? "Multi-Key" : type}
                  </button>
                ))}
              </div>

              {holdType === "key" && (
                <KeyCombobox
                  value={holdKey}
                  onChange={setHoldKey}
                  placeholder="Key when held..."
                />
              )}

              {holdType === "multi" && (
                <MultiKeyPicker
                  value={holdMultiKeys}
                  onChange={setHoldMultiKeys}
                />
              )}

              {holdType === "layer" && (
                <div className="space-y-2">
                  <select
                    value={holdLayer}
                    onChange={(e) => setHoldLayer(e.target.value)}
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
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHoldLayerMode("momentary")}
                      className={`
                        flex-1 px-2 py-1 rounded text-xs
                        ${
                          holdLayerMode === "momentary"
                            ? "bg-accent/20 text-accent border border-accent"
                            : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover border border-transparent"
                        }
                      `}
                    >
                      Momentary
                    </button>
                    <button
                      type="button"
                      onClick={() => setHoldLayerMode("toggle")}
                      className={`
                        flex-1 px-2 py-1 rounded text-xs
                        ${
                          holdLayerMode === "toggle"
                            ? "bg-accent/20 text-accent border border-accent"
                            : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover border border-transparent"
                        }
                      `}
                    >
                      Toggle
                    </button>
                  </div>
                  <div className="text-text-muted text-xs">
                    {holdLayerMode === "momentary"
                      ? "Layer active while held"
                      : "Layer toggles on/off"}
                  </div>
                </div>
              )}
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
              <div className="text-text-muted text-xs">
                Time to distinguish between tap and hold
              </div>
            </div>
          </>
        )}

        {actionType === "layer" && (
          <>
            <div className="space-y-2">
              <label className="text-text-secondary text-sm">
                Target Layer
              </label>
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
              <label className="text-text-secondary text-sm">
                Activation Mode
              </label>
              <div className="flex gap-2">
                {(["momentary", "toggle", "one-shot"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLayerMode(mode)}
                    className={`
                      px-3 py-1.5 rounded text-sm capitalize
                      ${
                        layerMode === mode
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
                {layerMode === "toggle" &&
                  "Toggle layer on/off with each press"}
                {layerMode === "one-shot" &&
                  "Layer active for next keypress only"}
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
