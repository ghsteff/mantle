/**
 * All available Kanata key codes organized by category.
 */

export interface KeyOption {
  value: string;
  label: string;
  category: string;
}

// Letters
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("").map((k) => ({
  value: k,
  label: k.toUpperCase(),
  category: "Letters",
}));

// Numbers
const NUMBERS = "1234567890".split("").map((k) => ({
  value: k,
  label: k,
  category: "Numbers",
}));

// Function keys
const FUNCTION_KEYS: KeyOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: `f${i + 1}`,
  label: `F${i + 1}`,
  category: "Function Keys",
}));

// Extended function keys
const EXTENDED_FUNCTION_KEYS: KeyOption[] = Array.from(
  { length: 12 },
  (_, i) => ({
    value: `f${i + 13}`,
    label: `F${i + 13}`,
    category: "Function Keys",
  }),
);

// Modifiers
const MODIFIERS: KeyOption[] = [
  { value: "lctl", label: "Left Control", category: "Modifiers" },
  { value: "rctl", label: "Right Control", category: "Modifiers" },
  { value: "lsft", label: "Left Shift", category: "Modifiers" },
  { value: "rsft", label: "Right Shift", category: "Modifiers" },
  { value: "lalt", label: "Left Option", category: "Modifiers" },
  { value: "ralt", label: "Right Option", category: "Modifiers" },
  { value: "lmet", label: "Left Command", category: "Modifiers" },
  { value: "rmet", label: "Right Command", category: "Modifiers" },
];

// Common Modifier Combinations (presets)
const MODIFIER_COMBOS: KeyOption[] = [
  {
    value: "(multi lctl lsft lalt)",
    label: "Meh (⌃⌥⇧)",
    category: "Modifier Combos",
  },
  {
    value: "(multi lctl lsft lalt lmet)",
    label: "Hyper (⌃⌥⇧⌘)",
    category: "Modifier Combos",
  },
];

// Navigation
const NAVIGATION: KeyOption[] = [
  { value: "up", label: "Up Arrow", category: "Navigation" },
  { value: "down", label: "Down Arrow", category: "Navigation" },
  { value: "left", label: "Left Arrow", category: "Navigation" },
  { value: "right", label: "Right Arrow", category: "Navigation" },
  { value: "home", label: "Home", category: "Navigation" },
  { value: "end", label: "End", category: "Navigation" },
  { value: "pgup", label: "Page Up", category: "Navigation" },
  { value: "pgdn", label: "Page Down", category: "Navigation" },
];

// Editing
const EDITING: KeyOption[] = [
  { value: "bspc", label: "Backspace", category: "Editing" },
  { value: "del", label: "Delete", category: "Editing" },
  { value: "ins", label: "Insert", category: "Editing" },
  { value: "ret", label: "Return", category: "Editing" },
  { value: "tab", label: "Tab", category: "Editing" },
  { value: "spc", label: "Space", category: "Editing" },
  { value: "esc", label: "Escape", category: "Editing" },
  { value: "caps", label: "Caps Lock", category: "Editing" },
];

// Punctuation & Symbols
const SYMBOLS: KeyOption[] = [
  { value: "grv", label: "Backtick", category: "Symbols" },
  { value: "-", label: "Minus", category: "Symbols" },
  { value: "=", label: "Equals", category: "Symbols" },
  { value: "[", label: "Left Bracket", category: "Symbols" },
  { value: "]", label: "Right Bracket", category: "Symbols" },
  { value: "\\", label: "Backslash", category: "Symbols" },
  { value: ";", label: "Semicolon", category: "Symbols" },
  { value: "'", label: "Quote", category: "Symbols" },
  { value: ",", label: "Comma", category: "Symbols" },
  { value: ".", label: "Period", category: "Symbols" },
  { value: "/", label: "Slash", category: "Symbols" },
];

// System/Media
const MEDIA: KeyOption[] = [
  { value: "volu", label: "Volume Up", category: "Media" },
  { value: "vold", label: "Volume Down", category: "Media" },
  { value: "mute", label: "Mute", category: "Media" },
  { value: "pp", label: "Play/Pause", category: "Media" },
  { value: "prev", label: "Previous Track", category: "Media" },
  { value: "next", label: "Next Track", category: "Media" },
  { value: "stop", label: "Stop", category: "Media" },
  { value: "brup", label: "Brightness Up", category: "Media" },
  { value: "brdn", label: "Brightness Down", category: "Media" },
];

// Special
const SPECIAL: KeyOption[] = [
  { value: "_", label: "Same as base layer", category: "Special" },
  { value: "XX", label: "Nothing (disable key)", category: "Special" },
  { value: "prnt", label: "Print Screen", category: "Special" },
  { value: "slck", label: "Scroll Lock", category: "Special" },
  { value: "pause", label: "Pause", category: "Special" },
  { value: "nlck", label: "Num Lock", category: "Special" },
  { value: "menu", label: "Menu", category: "Special" },
  { value: "fn", label: "Function (fn)", category: "Special" },
];

// Numpad
const NUMPAD: KeyOption[] = [
  { value: "kp0", label: "Numpad 0", category: "Numpad" },
  { value: "kp1", label: "Numpad 1", category: "Numpad" },
  { value: "kp2", label: "Numpad 2", category: "Numpad" },
  { value: "kp3", label: "Numpad 3", category: "Numpad" },
  { value: "kp4", label: "Numpad 4", category: "Numpad" },
  { value: "kp5", label: "Numpad 5", category: "Numpad" },
  { value: "kp6", label: "Numpad 6", category: "Numpad" },
  { value: "kp7", label: "Numpad 7", category: "Numpad" },
  { value: "kp8", label: "Numpad 8", category: "Numpad" },
  { value: "kp9", label: "Numpad 9", category: "Numpad" },
  { value: "kp+", label: "Numpad +", category: "Numpad" },
  { value: "kp-", label: "Numpad -", category: "Numpad" },
  { value: "kp*", label: "Numpad *", category: "Numpad" },
  { value: "kp/", label: "Numpad /", category: "Numpad" },
  { value: "kp.", label: "Numpad .", category: "Numpad" },
  { value: "kprt", label: "Numpad Enter", category: "Numpad" },
];

// Mouse (if enabled)
const MOUSE: KeyOption[] = [
  { value: "mlft", label: "Mouse Left Click", category: "Mouse" },
  { value: "mrgt", label: "Mouse Right Click", category: "Mouse" },
  { value: "mmid", label: "Mouse Middle Click", category: "Mouse" },
  { value: "mwu", label: "Mouse Wheel Up", category: "Mouse" },
  { value: "mwd", label: "Mouse Wheel Down", category: "Mouse" },
  { value: "mwl", label: "Mouse Wheel Left", category: "Mouse" },
  { value: "mwr", label: "Mouse Wheel Right", category: "Mouse" },
];

// Combine all keys
export const ALL_KANATA_KEYS: KeyOption[] = [
  ...SPECIAL,
  ...MODIFIER_COMBOS,
  ...MODIFIERS,
  ...LETTERS,
  ...NUMBERS,
  ...SYMBOLS,
  ...NAVIGATION,
  ...EDITING,
  ...FUNCTION_KEYS,
  ...EXTENDED_FUNCTION_KEYS,
  ...MEDIA,
  ...NUMPAD,
  ...MOUSE,
];

// Get unique categories in display order
export const KEY_CATEGORIES = [
  "Special",
  "Modifier Combos",
  "Modifiers",
  "Letters",
  "Numbers",
  "Symbols",
  "Navigation",
  "Editing",
  "Function Keys",
  "Media",
  "Numpad",
  "Mouse",
];

// Helper to find a key option by value
export function findKeyOption(value: string): KeyOption | undefined {
  return ALL_KANATA_KEYS.find((k) => k.value === value);
}
