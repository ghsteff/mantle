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
import { Slider } from "@/components/ui/slider";

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
    <div className="space-y-5">
      <div className="pb-3 border-b border-border">
        <span className="text-muted-foreground text-xs">Editing</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-foreground font-mono text-base font-semibold">{label}</span>
          <span className="text-muted-foreground text-xs">({keyId})</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium">
            Mode
          </label>
          <div className="flex bg-secondary rounded-md p-0.5 border border-border">
            {(["simple", "tap-hold", "layer"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActionType(type)}
                className={`flex-1 px-2 py-1.5 rounded-sm text-xs font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  actionType === type
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type === "simple" && <Pointer className="h-3 w-3 shrink-0" />}
                {type === "tap-hold" && <Hand className="h-3 w-3 shrink-0" />}
                {type === "layer" && <Layers className="h-3 w-3 shrink-0" />}
                {type === "tap-hold" ? "Tap-Hold" : type === "simple" ? "Simple" : "Layer"}
              </button>
            ))}
          </div>
        </div>

        {actionType === "simple" && (
          <div className="space-y-2 pt-2">
            <label className="text-xs text-muted-foreground font-medium">
              Key output
            </label>
            <TerminalKeyInput
              value={simpleKey}
              onChange={setSimpleKey}
              placeholder="Select key..."
            />
            <div className="text-muted-foreground text-xs">
              Use <code className="bg-accent px-1 rounded-sm">_</code> for
              transparent (inherit from lower layer)
            </div>
          </div>
        )}

        {actionType === "tap-hold" && (
          <>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Pointer className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-xs text-muted-foreground font-medium">
                  On tap
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
                <label className="text-xs text-muted-foreground font-medium">
                  On hold
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
                    className="w-full px-3 py-2 bg-secondary border border-border font-mono text-sm
                               text-foreground
                               focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
                  <div className="text-muted-foreground text-xs">
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
                <label className="text-xs text-muted-foreground font-medium">
                  Hold timeout: {timeout}ms
                </label>
                <Slider
                  min={0}
                  max={500}
                  step={5}
                  value={[timeout]}
                  onValueChange={(values) => setTimeout(values[0])}
                />
                <div className="text-muted-foreground text-xs">
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
                <label className="text-xs text-muted-foreground font-medium">
                  Target layer
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
              <label className="text-xs text-muted-foreground font-medium">
                Activation mode
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
              <div className="text-muted-foreground text-xs">
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
