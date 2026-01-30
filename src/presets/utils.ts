import type { KeyboardConfig, KeyboardLayer } from "../types";

/**
 * Standard source keys for a US QWERTY keyboard.
 * This is the physical layout that all presets build upon.
 */
export const STANDARD_SOURCE_KEYS = [
  // Function row
  "esc", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
  // Number row
  "grv", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "bspc",
  // Top row
  "tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\",
  // Home row
  "caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "ret",
  // Bottom row
  "lsft", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "rsft",
  // Modifier row
  "lctl", "lmet", "lalt", "spc", "ralt", "rmet", "rctl",
];

/**
 * Creates a base layer where all keys map to themselves (passthrough).
 */
export function createPassthroughLayer(name: string): KeyboardLayer {
  const keys: Record<string, string> = {};
  for (const key of STANDARD_SOURCE_KEYS) {
    keys[key] = key;
  }
  return { name, keys };
}

/**
 * Creates a transparent layer where all keys fall through to the layer below.
 */
export function createTransparentLayer(name: string): KeyboardLayer {
  const keys: Record<string, string> = {};
  for (const key of STANDARD_SOURCE_KEYS) {
    keys[key] = "_";
  }
  return { name, keys };
}

/**
 * Creates a basic config with just a passthrough base layer.
 */
export function createBaseConfig(): KeyboardConfig {
  return {
    sourceKeys: [...STANDARD_SOURCE_KEYS],
    layers: [createPassthroughLayer("base")],
  };
}

