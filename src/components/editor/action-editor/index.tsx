import { useId, useMemo, type ReactNode } from "react";
import { Hand, Keyboard, Layers, TriangleAlertIcon } from "lucide-react";
import { KeyPicker } from "./components/key-picker";
import { useActionEditor, type ActionKind } from "./hooks/use-action-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { parseLayerAction, type LayerMode } from "@/kanata/key-action";
import type { KeyboardLayer } from "@/types";

interface ActionEditorProps {
  keyId: string;
  currentAction: string;
  onSave: (action: string) => void;
  layers: KeyboardLayer[];
  activeLayer: string;
}

const KIND_OPTIONS: { kind: ActionKind; label: string; icon: ReactNode; hint: string }[] = [
  {
    kind: "key",
    label: "Key",
    icon: <Keyboard className="size-3 shrink-0" />,
    hint: "Sends a key or shortcut.",
  },
  {
    kind: "tap-hold",
    label: "Tap & hold",
    icon: <Hand className="size-3 shrink-0" />,
    hint: "Does one thing when tapped and another when held.",
  },
  {
    kind: "layer",
    label: "Layer",
    icon: <Layers className="size-3 shrink-0" />,
    hint: "Changes what the other keys do.",
  },
];

const LAYER_MODES: { mode: LayerMode; label: string; hint: string }[] = [
  { mode: "while-held", label: "While held", hint: "Active only while this key is held down." },
  { mode: "switch", label: "Switch", hint: "Stays active until another key switches away." },
  { mode: "one-shot", label: "One-shot", hint: "Active for the next key press only." },
];

const MIN_HOLD_TIMEOUT_MS = 100;
const MAX_HOLD_TIMEOUT_MS = 500;

function FieldLabel({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div id={id} className="text-[11px] font-medium text-muted-foreground">
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-muted/50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-medium outline-none",
            "transition-all duration-150 ease-out focus-visible:ring-1 focus-visible:ring-white/40",
            value === option.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LayerSelect({
  value,
  layers,
  onChange,
}: {
  value: string;
  layers: string[];
  onChange: (layer: string) => void;
}) {
  if (layers.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        This profile has only one layer. Add a layer with the + next to the
        layer tabs, then come back here.
      </p>
    );
  }
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full bg-secondary font-mono">
        <SelectValue placeholder="Choose a layer…" />
      </SelectTrigger>
      <SelectContent>
        {layers.map((layer) => (
          <SelectItem key={layer} value={layer} className="font-mono">
            {layer}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ActionEditor({
  keyId,
  currentAction,
  onSave,
  layers,
  activeLayer,
}: ActionEditorProps) {
  const ids = useId();
  const baseLayer = layers[0]?.name;
  const isBaseLayer = activeLayer === baseLayer;
  const otherLayers = useMemo(
    () => layers.map((layer) => layer.name).filter((name) => name !== activeLayer),
    [layers, activeLayer],
  );
  const { state, update } = useActionEditor({
    keyId,
    layer: activeLayer,
    currentAction,
    onSave,
    otherLayers,
  });

  const isHoldLayer = state.hold.startsWith("(layer") || parseLayerAction(state.hold) !== null;
  const holdLayer = parseLayerAction(state.hold)?.layer ?? "";
  const kindHint = KIND_OPTIONS.find((option) => option.kind === state.kind)?.hint;

  const switchTarget = layers.find((layer) => layer.name === state.layer);
  const canSwitchBack =
    !switchTarget ||
    switchTarget.name === baseLayer ||
    Object.values(switchTarget.keys).some((action) => {
      const target = parseLayerAction(action);
      return target?.mode === "switch" && target.layer !== switchTarget.name;
    });

  return (
    <div className="space-y-5 animate-slide-up-fade">
      <div className="space-y-2">
        <Segmented
          label="Behavior"
          value={state.kind}
          onChange={(kind) => update({ kind })}
          options={KIND_OPTIONS.map((option) => ({
            value: option.kind,
            label: (
              <>
                {option.icon}
                {option.label}
              </>
            ),
          }))}
        />
        <p className="text-[11px] text-muted-foreground/80">{kindHint}</p>
      </div>

      {state.kind === "key" && (
        <div className="space-y-2">
          <FieldLabel id={`${ids}-sends`}>Sends</FieldLabel>
          <KeyPicker
            aria-labelledby={`${ids}-sends`}
            value={state.output}
            onChange={(output) => update({ output, tap: output })}
            allowTransparent={!isBaseLayer}
          />
        </div>
      )}

      {state.kind === "tap-hold" && (
        <>
          <div className="space-y-2">
            <FieldLabel id={`${ids}-tap`}>When tapped</FieldLabel>
            <KeyPicker
              aria-labelledby={`${ids}-tap`}
              value={state.tap}
              onChange={(tap) => update({ tap, output: tap })}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel id={`${ids}-hold`}>When held</FieldLabel>
            <Segmented
              label="When held"
              value={isHoldLayer ? "layer" : "key"}
              onChange={(holdKind) =>
                update({
                  hold:
                    holdKind === "key"
                      ? ""
                      : otherLayers[0]
                        ? `(layer-while-held ${otherLayers[0]})`
                        : "(layer-while-held )",
                })
              }
              options={[
                { value: "key", label: "Key or modifier" },
                { value: "layer", label: "Layer" },
              ]}
            />
            {isHoldLayer ? (
              <LayerSelect
                value={holdLayer}
                layers={otherLayers}
                onChange={(layer) => update({ hold: `(layer-while-held ${layer})` })}
              />
            ) : (
              <KeyPicker
                aria-labelledby={`${ids}-hold`}
                value={state.hold}
                onChange={(hold) => update({ hold })}
                placeholder="Choose what holding sends…"
              />
            )}
          </div>

          {state.hold && (
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <FieldLabel>Hold after</FieldLabel>
                <span className="font-mono text-[11px] text-foreground/80">{state.timeout} ms</span>
              </div>
              <Slider
                aria-label="Hold after"
                min={MIN_HOLD_TIMEOUT_MS}
                max={MAX_HOLD_TIMEOUT_MS}
                step={10}
                value={[Math.min(Math.max(state.timeout, MIN_HOLD_TIMEOUT_MS), MAX_HOLD_TIMEOUT_MS)]}
                onValueChange={(values) => update({ timeout: values[0] })}
              />
              <p className="text-[11px] text-muted-foreground/80">
                Shorter feels snappier but triggers holds by accident more often.
              </p>
            </div>
          )}
        </>
      )}

      {state.kind === "layer" && (
        <>
          <div className="space-y-2">
            <FieldLabel>Layer</FieldLabel>
            <LayerSelect
              value={state.layer}
              layers={otherLayers}
              onChange={(layer) => update({ layer })}
            />
          </div>

          {otherLayers.length > 0 && (
            <div className="space-y-2">
              <FieldLabel>Activation</FieldLabel>
              <div role="radiogroup" aria-label="Activation" className="space-y-1">
                {LAYER_MODES.map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    role="radio"
                    aria-checked={state.layerMode === option.mode}
                    onClick={() => update({ layerMode: option.mode })}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left outline-none transition-colors focus-visible:border-white/30",
                      state.layerMode === option.mode
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <div className="text-xs font-medium text-foreground">{option.label}</div>
                    <div className="text-[11px] text-muted-foreground">{option.hint}</div>
                  </button>
                ))}
              </div>
              {state.layerMode === "switch" && !canSwitchBack && (
                <p className="flex gap-2 rounded-md border border-status-warning/30 bg-status-warning-bg px-3 py-2 text-[11px] leading-relaxed text-status-warning">
                  <TriangleAlertIcon className="mt-0.5 size-3 shrink-0" />
                  <span>
                    “{state.layer}” has no key that switches back. Add one, or
                    you’ll be stuck on that layer until you stop Kanata.
                  </span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
