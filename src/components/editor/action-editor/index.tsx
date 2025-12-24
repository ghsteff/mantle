import { getKeyLabel } from "../../keyboard/layout";
import { KeyCombobox } from "../key-combobox";
import { MultiKeyPicker } from "../multi-key-picker";
import { useActionEditor, type KeyType } from "./hooks/use-action-editor";

interface ActionEditorProps {
  keyId: string;
  currentAction: string;
  onSave: (action: string) => void;
  layers: string[];
}

/**
 * Editor for configuring key actions.
 * Changes are automatically saved as you edit.
 */
export function ActionEditor({
  keyId,
  currentAction,
  onSave,
  layers,
}: ActionEditorProps) {
  const {
    actionType,
    simpleKeyType,
    simpleKey,
    simpleMultiKeys,
    tapKeyType,
    tapKey,
    tapMultiKeys,
    holdType,
    holdKey,
    holdMultiKeys,
    holdLayer,
    holdLayerMode,
    timeout,
    layerName,
    layerMode,
    setActionType,
    setSimpleKeyType,
    setSimpleKey,
    setSimpleMultiKeys,
    setTapKeyType,
    setTapKey,
    setTapMultiKeys,
    setHoldType,
    setHoldKey,
    setHoldMultiKeys,
    setHoldLayer,
    setHoldLayerMode,
    setTimeout,
    setLayerName,
    setLayerMode,
  } = useActionEditor({ keyId, currentAction, onSave, layers });

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
    </div>
  );
}
