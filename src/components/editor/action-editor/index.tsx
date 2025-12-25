import { Button } from "@/components/ui/button";
import { getKeyLabel } from "../../keyboard/utils/layout";
import { TerminalKeyInput } from "./components/terminal-key-input";
import { useActionEditor } from "./hooks/use-action-editor";
import { Pointer, Hand, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActionEditorProps {
  keyId: string;
  currentAction: string;
  onSave: (action: string) => void;
  layers: string[];
}

function isHoldKeyEmpty(value: string): boolean {
  return !value || value.trim() === "";
}

export function ActionEditor({
  keyId,
  currentAction,
  onSave,
  layers,
}: ActionEditorProps) {
  const {
    actionType,
    simpleKey,
    tapKey,
    holdKey,
    holdLayer,
    holdLayerMode,
    timeout,
    layerName,
    layerMode,
    setActionType,
    setSimpleKey,
    setTapKey,
    setHoldKey,
    setHoldLayer,
    setHoldLayerMode,
    setTimeout,
    setLayerName,
    setLayerMode,
  } = useActionEditor({ keyId, currentAction, onSave, layers });

  const { label } = getKeyLabel(keyId);

  const isHoldActionSet = !isHoldKeyEmpty(holdKey);

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-border">
        <div className="text-text-bright text-sm font-mono flex items-center gap-1">
          <span className="font-semibold uppercase tracking-wide">
            EDITING:
          </span>
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">({keyId})</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-text-secondary text-xs uppercase tracking-wide">
            Mode
          </label>
          <div className="flex gap-2">
            {(["simple", "tap-hold", "layer"] as const).map((type) => (
              <Button
                key={type}
                onClick={() => setActionType(type)}
                variant={actionType === type ? "default" : "outline"}
                size="xs"
                className="flex items-center gap-1.5"
              >
                {type === "simple" && <Pointer className="h-3 w-3" />}
                {type === "tap-hold" && <Hand className="h-3 w-3" />}
                {type === "layer" && <Layers className="h-3 w-3" />}
                {type === "tap-hold" ? "Tap-Hold" : type}
              </Button>
            ))}
          </div>
        </div>

        {actionType === "simple" && (
          <div className="space-y-2 pt-2">
            <label className="text-text-secondary text-xs uppercase tracking-wide">
              Key Output
            </label>
            <TerminalKeyInput
              value={simpleKey}
              onChange={setSimpleKey}
              placeholder="Select key..."
            />
            <div className="text-text-muted text-xs">
              Use <code className="bg-bg-hover px-1 rounded-sm">_</code> for
              transparent (inherit from lower layer)
            </div>
          </div>
        )}

        {actionType === "tap-hold" && (
          <>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Pointer className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-text-secondary text-xs uppercase tracking-wide">
                  ON TAP
                </label>
              </div>
              <TerminalKeyInput
                value={tapKey}
                onChange={setTapKey}
                placeholder="Key when tapped..."
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Hand className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-text-secondary text-xs uppercase tracking-wide">
                  ON HOLD
                </label>
              </div>
              <div className="flex gap-2 mb-2">
                {(["key", "layer"] as const).map((type) => (
                  <Button
                    key={type}
                    onClick={() => {
                      if (type === "key") {
                        setHoldKey("");
                      } else {
                        setHoldKey(
                          holdLayerMode === "momentary"
                            ? `(layer-while-held ${holdLayer})`
                            : `(layer-toggle ${holdLayer})`
                        );
                      }
                    }}
                    variant={
                      (type === "key" && !holdKey.startsWith("(layer-")) ||
                      (type === "layer" && holdKey.startsWith("(layer-"))
                        ? "default"
                        : "outline"
                    }
                    size="xs"
                  >
                    {type === "layer" ? "Layer" : "Key"}
                  </Button>
                ))}
              </div>

              {holdKey.startsWith("(layer-") ? (
                <div className="space-y-2">
                  <select
                    value={holdLayer}
                    onChange={(e) => {
                      const newLayer = e.target.value;
                      setHoldLayer(newLayer);
                      setHoldKey(
                        holdLayerMode === "momentary"
                          ? `(layer-while-held ${newLayer})`
                          : `(layer-toggle ${newLayer})`
                      );
                    }}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border font-mono text-sm
                               text-text-primary
                               focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  >
                    {layers.map((layer) => (
                      <option key={layer} value={layer}>
                        {layer}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setHoldLayerMode("momentary");
                        setHoldKey(`(layer-while-held ${holdLayer})`);
                      }}
                      variant={
                        holdLayerMode === "momentary" ? "default" : "outline"
                      }
                      size="xs"
                    >
                      Momentary
                    </Button>
                    <Button
                      onClick={() => {
                        setHoldLayerMode("toggle");
                        setHoldKey(`(layer-toggle ${holdLayer})`);
                      }}
                      variant={
                        holdLayerMode === "toggle" ? "default" : "outline"
                      }
                      size="xs"
                    >
                      Toggle
                    </Button>
                  </div>
                  <div className="text-text-muted text-xs">
                    {holdLayerMode === "momentary"
                      ? "Layer active while held"
                      : "Layer toggles on/off"}
                  </div>
                </div>
              ) : (
                <TerminalKeyInput
                  value={holdKey}
                  onChange={setHoldKey}
                  placeholder="Key when held (empty for tap-only)..."
                />
              )}
            </div>

            {isHoldActionSet && (
              <div className="space-y-2 pt-2">
                <label className="text-text-secondary text-xs uppercase tracking-wide">
                  HOLD TIMEOUT: {timeout}ms
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
            )}
          </>
        )}

        {actionType === "layer" && (
          <>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-text-secondary text-xs uppercase tracking-wide">
                  TARGET LAYER
                </label>
              </div>
              <Select value={layerName} onValueChange={setLayerName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select layer..." />
                  <SelectContent>
                    {layers.map((layer) => (
                      <SelectItem key={layer} value={layer}>
                        {layer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectTrigger>
              </Select>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-text-secondary text-xs uppercase tracking-wide">
                ACTIVATION MODE
              </label>
              <div className="flex gap-2">
                {(["momentary", "toggle", "one-shot"] as const).map((mode) => (
                  <Button
                    key={mode}
                    onClick={() => setLayerMode(mode)}
                    variant={layerMode === mode ? "default" : "outline"}
                    size="xs"
                  >
                    {mode}
                  </Button>
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
