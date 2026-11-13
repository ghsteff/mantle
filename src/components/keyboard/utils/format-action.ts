import { findKeyOption } from "../../editor/kanata-keys";
import {
  MODIFIER_LABELS,
  MODIFIER_ORDER,
  MODIFIER_SHORT_LABELS,
  MODIFIER_SYMBOLS,
  TRANSPARENT,
  modifierNameOf,
  parseKeyAction,
  parseKeyOutput,
  type LayerMode,
} from "../../../kanata/key-action";
import { getKeyLabel } from "./layout";

export interface FormattedAction {
  primary: string;
  secondary?: string;
}

function modifierNames(modifiers: string[]) {
  const names = new Set(modifiers.map(modifierNameOf));
  return MODIFIER_ORDER.filter((name) => names.has(name));
}

function formatModifiersOnly(modifiers: string[]): string {
  const names = modifierNames(modifiers);
  if (names.length === 4) return "Hyper";
  if (names.length === 3 && !names.includes("cmd")) return "Meh";
  if (names.length === 1) return MODIFIER_SHORT_LABELS[names[0]];
  return names.map((name) => MODIFIER_SYMBOLS[name]).join("");
}

/** Compact label for a key output, e.g. `⌘C`, `Hyper`, `Esc`. */
export function formatKeyOutput(value: string): string {
  if (value === TRANSPARENT) return "—";
  if (value === "XX") return "None";

  const { modifiers, keys, expression } = parseKeyOutput(value);
  if (expression) return expression;
  if (keys.length === 0) return formatModifiersOnly(modifiers);

  const symbols = modifierNames(modifiers)
    .map((name) => MODIFIER_SYMBOLS[name])
    .join("");
  return symbols + keys.map((key) => getKeyLabel(key).label).join(" ");
}

/** Spelled-out label for a key output, e.g. `Command + C`. */
export function describeKeyOutput(value: string): string {
  if (value === TRANSPARENT) return "the base layer’s key";
  if (value === "XX") return "nothing";

  const { modifiers, keys, expression } = parseKeyOutput(value);
  if (expression) return expression;

  const modifierText = modifierNames(modifiers).map((name) => MODIFIER_LABELS[name]);
  const keyText = keys.map((key) => findKeyOption(key)?.label ?? getKeyLabel(key).label);
  return [...modifierText, ...keyText].join(" + ");
}

const LAYER_MODE_SHORT: Record<LayerMode, string> = {
  "while-held": "hold",
  switch: "switch",
  "one-shot": "one-shot",
};

/** Label shown on a key cap: the main output plus what holding does. */
export function formatAction(action: string): FormattedAction {
  const parsed = parseKeyAction(action);

  switch (parsed.kind) {
    case "key":
      return { primary: formatKeyOutput(parsed.output) };
    case "tap-hold": {
      const holdLayer = parseKeyAction(parsed.hold);
      return {
        primary: formatKeyOutput(parsed.tap),
        secondary:
          holdLayer.kind === "layer" ? `${holdLayer.layer} layer` : formatKeyOutput(parsed.hold),
      };
    }
    case "layer":
      return { primary: parsed.layer, secondary: `layer · ${LAYER_MODE_SHORT[parsed.mode]}` };
  }
}

function describeLayer(layer: string, mode: LayerMode) {
  switch (mode) {
    case "while-held":
      return `turns on the “${layer}” layer while held`;
    case "switch":
      return `switches to the “${layer}” layer`;
    case "one-shot":
      return `turns on the “${layer}” layer for the next key`;
  }
}

/** One sentence describing what pressing the key does. */
export function describeAction(action: string): string {
  const parsed = parseKeyAction(action);

  switch (parsed.kind) {
    case "key":
      if (parsed.output === TRANSPARENT) return "Does whatever the base layer does";
      if (parsed.output === "XX") return "Does nothing";
      return `Sends ${describeKeyOutput(parsed.output)}`;
    case "tap-hold": {
      const hold = parseKeyAction(parsed.hold);
      const holdText =
        hold.kind === "layer" ? `the “${hold.layer}” layer` : describeKeyOutput(parsed.hold);
      return `Tap for ${describeKeyOutput(parsed.tap)}, hold for ${holdText}`;
    }
    case "layer": {
      const text = describeLayer(parsed.layer, parsed.mode);
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  }
}
