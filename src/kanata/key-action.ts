/**
 * Parses and builds the Kanata action strings the key editor understands.
 *
 * Kanata semantics worth knowing:
 * - `layer-toggle` is an alias of `layer-while-held` (momentary), not a latch.
 * - `layer-switch` changes the base layer until another key switches away.
 * - `one-shot` requires a timeout: `(one-shot <ms> <action>)`.
 */

export type LayerMode = "while-held" | "switch" | "one-shot";

export type KeyAction =
  | { kind: "key"; output: string }
  | { kind: "tap-hold"; tap: string; hold: string; timeout: number }
  | { kind: "layer"; layer: string; mode: LayerMode };

export const TRANSPARENT = "_";
export const DEFAULT_HOLD_TIMEOUT_MS = 200;
const ONE_SHOT_TIMEOUT_MS = 2000;

const MODIFIER_GROUPS = {
  ctrl: ["lctl", "rctl"],
  alt: ["lalt", "ralt"],
  shift: ["lsft", "rsft"],
  cmd: ["lmet", "rmet"],
} as const;

export type ModifierName = keyof typeof MODIFIER_GROUPS;

export const MODIFIER_ORDER: ModifierName[] = ["ctrl", "alt", "shift", "cmd"];

export const MODIFIER_SYMBOLS: Record<ModifierName, string> = {
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
  cmd: "⌘",
};

export const MODIFIER_LABELS: Record<ModifierName, string> = {
  ctrl: "Control",
  alt: "Option",
  shift: "Shift",
  cmd: "Command",
};

export const MODIFIER_SHORT_LABELS: Record<ModifierName, string> = {
  ctrl: "Ctrl",
  alt: "Opt",
  shift: "Shift",
  cmd: "Cmd",
};

const PREFIX_MODIFIERS: Record<string, string> = {
  C: "lctl",
  S: "lsft",
  A: "lalt",
  M: "lmet",
  RC: "rctl",
  RS: "rsft",
  RA: "ralt",
  AG: "ralt",
  RM: "rmet",
};

export function modifierNameOf(key: string): ModifierName | null {
  for (const name of MODIFIER_ORDER) {
    if ((MODIFIER_GROUPS[name] as readonly string[]).includes(key)) return name;
  }
  return null;
}

/** Splits a list expression `(a b (c d))` into its top-level items. */
export function splitList(expression: string): string[] | null {
  const text = expression.trim();
  if (!text.startsWith("(") || !text.endsWith(")")) return null;

  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text.slice(1, -1)) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth < 0) return null;
    if (/\s/.test(char) && depth === 0) {
      if (current) items.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (depth !== 0) return null;
  if (current) items.push(current);
  return items;
}

export interface KeyOutput {
  modifiers: string[];
  keys: string[];
  /** Set when the output is an expression the picker can't edit piece by piece. */
  expression: string | null;
}

/**
 * Reads a single-key output such as `a`, `lctl`, `C-right` or
 * `(multi lmet lsft 4)` into modifier keys plus the remaining keys.
 */
export function parseKeyOutput(value: string): KeyOutput {
  if (!value) return { modifiers: [], keys: [], expression: null };

  const items = splitList(value);
  if (items) {
    if (items[0] !== "multi" || items.slice(1).some((item) => item.startsWith("("))) {
      return { modifiers: [], keys: [], expression: value };
    }
    const tokens = items.slice(1);
    return {
      modifiers: tokens.filter((token) => modifierNameOf(token)),
      keys: tokens.filter((token) => !modifierNameOf(token)),
      expression: null,
    };
  }

  const modifiers: string[] = [];
  let rest = value;
  for (;;) {
    const match = rest.match(/^(RC|RS|RA|AG|RM|C|S|A|M)-(.+)$/);
    if (!match) break;
    modifiers.push(PREFIX_MODIFIERS[match[1]]);
    rest = match[2];
  }
  if (modifierNameOf(rest)) {
    return { modifiers: [...modifiers, rest], keys: [], expression: null };
  }
  return { modifiers, keys: [rest], expression: null };
}

export function buildKeyOutput(modifiers: string[], keys: string[]): string {
  const ordered = [...modifiers].sort(
    (a, b) =>
      MODIFIER_ORDER.indexOf(modifierNameOf(a) as ModifierName) -
      MODIFIER_ORDER.indexOf(modifierNameOf(b) as ModifierName),
  );
  const tokens = [...ordered, ...keys];
  if (tokens.length === 0) return "";
  if (tokens.length === 1) return tokens[0];
  return `(multi ${tokens.join(" ")})`;
}

export function buildLayerAction(mode: LayerMode, layer: string): string {
  switch (mode) {
    case "while-held":
      return `(layer-while-held ${layer})`;
    case "switch":
      return `(layer-switch ${layer})`;
    case "one-shot":
      return `(one-shot ${ONE_SHOT_TIMEOUT_MS} (layer-while-held ${layer}))`;
  }
}

export function parseLayerAction(action: string): { layer: string; mode: LayerMode } | null {
  const items = splitList(action);
  if (!items || items.length < 2) return null;

  const [head, ...args] = items;
  if ((head === "layer-while-held" || head === "layer-toggle") && args.length === 1) {
    return { layer: args[0], mode: "while-held" };
  }
  if (head === "layer-switch" && args.length === 1) {
    return { layer: args[0], mode: "switch" };
  }
  if (head === "one-shot") {
    const inner = args[args.length - 1];
    if (args.length === 1) return { layer: inner, mode: "one-shot" };
    const innerLayer = parseLayerAction(inner);
    if (innerLayer?.mode === "while-held") {
      return { layer: innerLayer.layer, mode: "one-shot" };
    }
  }
  return null;
}

export function parseKeyAction(action: string): KeyAction {
  const layerAction = parseLayerAction(action);
  if (layerAction) return { kind: "layer", ...layerAction };

  const items = splitList(action);
  if (items?.[0] === "tap-hold" && items.length === 5 && /^\d+$/.test(items[1])) {
    return {
      kind: "tap-hold",
      timeout: Number(items[1]),
      tap: items[3],
      hold: items[4],
    };
  }

  return { kind: "key", output: action };
}

export function buildKeyAction(action: KeyAction): string {
  switch (action.kind) {
    case "key":
      return action.output;
    case "tap-hold":
      if (!action.hold) return action.tap;
      return `(tap-hold ${action.timeout} ${action.timeout} ${action.tap} ${action.hold})`;
    case "layer":
      return buildLayerAction(action.mode, action.layer);
  }
}

/** The action a key has when nothing is assigned to it on the given layer. */
export function defaultActionFor(keyId: string, isBaseLayer: boolean): string {
  return isBaseLayer ? keyId : TRANSPARENT;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function layerReferencePattern(layer: string) {
  return new RegExp(
    `(\\((?:layer-while-held|layer-toggle|layer-switch|one-shot(?:\\s+\\d+)?)\\s+)${escapeRegExp(layer)}(?=\\))`,
    "g",
  );
}

export function referencesLayer(action: string, layer: string): boolean {
  return layerReferencePattern(layer).test(action);
}

export function renameLayerReferences(action: string, from: string, to: string): string {
  return action.replace(layerReferencePattern(from), `$1${to}`);
}

/** Names of aliases whose action switches to the layer. */
export function aliasesReferencingLayer(
  aliases: Record<string, string> | undefined,
  layer: string,
): string[] {
  return Object.entries(aliases ?? {})
    .filter(([, action]) => referencesLayer(action, layer))
    .map(([name]) => name);
}

export function referencesAlias(action: string, aliases: string[]): boolean {
  return aliases.some((alias) =>
    new RegExp(`@${escapeRegExp(alias)}(?![\\w-])`).test(action),
  );
}

const LEGACY_ONE_SHOT = /\(one-shot\s+([^\s()\d][^\s()]*)\)/g;

/**
 * Earlier versions saved one-shot layer keys as `(one-shot <layer>)`, which
 * Kanata rejects because it needs a timeout and an action.
 */
export function repairLegacyActions<T extends { layers: { name: string; keys: Record<string, string> }[] }>(
  config: T,
): { config: T; repairedCount: number } {
  let repairedCount = 0;
  const layers = config.layers.map((layer) => {
    let changed = false;
    const keys = Object.fromEntries(
      Object.entries(layer.keys).map(([keyId, action]) => {
        const repaired = action.replace(LEGACY_ONE_SHOT, (_, layerName: string) =>
          buildLayerAction("one-shot", layerName),
        );
        if (repaired !== action) {
          repairedCount++;
          changed = true;
        }
        return [keyId, repaired];
      }),
    );
    return changed ? { ...layer, keys } : layer;
  });
  return repairedCount === 0 ? { config, repairedCount } : { config: { ...config, layers }, repairedCount };
}
