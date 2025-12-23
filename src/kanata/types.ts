/**
 * Represents a single layer in the keyboard configuration.
 * Each layer maps physical keys to their actions.
 */
export interface KeyboardLayer {
  name: string;
  keys: Record<string, string>; // Map physical key to action
}

/**
 * A tap-hold action that performs one action on tap and another on hold.
 */
export interface TapHoldAction {
  type: "tap-hold";
  tap: string;
  hold: string;
  /** Hold timeout in milliseconds (default: 200) */
  timeout?: number;
}

/**
 * A multi-tap action that performs different actions based on tap count.
 */
export interface MultiTapAction {
  type: "multi-tap";
  taps: string[]; // Actions for 1st tap, 2nd tap, etc.
  /** Timeout between taps in milliseconds (default: 200) */
  timeout?: number;
}

/**
 * A simple key remap action.
 */
export interface RemapAction {
  type: "remap";
  key: string;
}

/**
 * A layer switch action.
 */
export interface LayerAction {
  type: "layer";
  /** The layer to switch to */
  layer: string;
  /** How to activate: momentary (while held), toggle, or one-shot */
  mode: "momentary" | "toggle" | "one-shot";
}

/**
 * Union of all possible key actions.
 */
export type KeyAction =
  | TapHoldAction
  | MultiTapAction
  | RemapAction
  | LayerAction
  | string;

/**
 * Extended layer that supports complex actions.
 */
export interface KeyboardLayerExtended {
  name: string;
  keys: Record<string, KeyAction>;
}

/**
 * The complete keyboard configuration.
 */
export interface KeyboardConfig {
  /** The source keys layout (physical keyboard) */
  sourceKeys: string[];
  /** All configured layers */
  layers: KeyboardLayer[];
  /** Optional: define aliases for complex actions */
  aliases?: Record<string, string>;
}

/**
 * Standard QWERTY source keys for a typical keyboard.
 * This defines the physical key positions using Kanata key names.
 * See: https://github.com/jtroo/kanata/blob/main/docs/config.adoc
 */
export const STANDARD_QWERTY_KEYS = [
  // Number row
  "grv",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  "-",
  "=",
  "bspc",
  // Top row (using literal characters where Kanata expects them)
  "tab",
  "q",
  "w",
  "e",
  "r",
  "t",
  "y",
  "u",
  "i",
  "o",
  "p",
  "[",
  "]",
  "\\",
  // Home row
  "caps",
  "a",
  "s",
  "d",
  "f",
  "g",
  "h",
  "j",
  "k",
  "l",
  ";",
  "'",
  "ret",
  // Bottom row
  "lsft",
  "z",
  "x",
  "c",
  "v",
  "b",
  "n",
  "m",
  ",",
  ".",
  "/",
  "rsft",
  // Modifier row
  "lctl",
  "lmet",
  "lalt",
  "spc",
  "ralt",
  "rmet",
  "rctl",
] as const;

export type StandardKey = (typeof STANDARD_QWERTY_KEYS)[number];

/**
 * Create an empty layer with all keys mapped to themselves (passthrough).
 */
export function createEmptyLayer(
  name: string,
  sourceKeys: readonly string[]
): KeyboardLayer {
  const keys: Record<string, string> = {};
  for (const key of sourceKeys) {
    keys[key] = "_"; // _ means "transparent" in Kanata (inherit from lower layer)
  }
  return { name, keys };
}

/**
 * Create a base layer with all keys mapped to themselves.
 */
export function createBaseLayer(sourceKeys: readonly string[]): KeyboardLayer {
  const keys: Record<string, string> = {};
  for (const key of sourceKeys) {
    keys[key] = key; // Map each key to itself
  }
  return { name: "base", keys };
}
