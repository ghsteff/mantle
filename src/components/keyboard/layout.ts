/**
 * Key definition for the keyboard layout.
 */
export interface KeyDef {
  /** Kanata key name (e.g., "caps", "lsft", "a") */
  id: string;
  /** Display label for the key */
  label: string;
  /** Secondary label (e.g., shifted character) */
  subLabel?: string;
  /** Width in units (1 = standard key) */
  width: number;
  /** Height in units (1 = standard key) */
  height?: number;
  /** Row index (0 = top) */
  row: number;
  /** Starting column position */
  col: number;
  /** Whether this is a gap/spacer (not a real key) */
  isSpacer?: boolean;
}

/**
 * Map of Kanata key IDs to human-readable labels.
 * Kanata uses literal characters for many punctuation keys.
 */
export const KEY_LABELS: Record<string, { label: string; subLabel?: string }> =
  {
    // Function row
    esc: { label: "Esc" },
    f1: { label: "F1" },
    f2: { label: "F2" },
    f3: { label: "F3" },
    f4: { label: "F4" },
    f5: { label: "F5" },
    f6: { label: "F6" },
    f7: { label: "F7" },
    f8: { label: "F8" },
    f9: { label: "F9" },
    f10: { label: "F10" },
    f11: { label: "F11" },
    f12: { label: "F12" },

    // Number row
    grv: { label: "`", subLabel: "~" },
    "1": { label: "1", subLabel: "!" },
    "2": { label: "2", subLabel: "@" },
    "3": { label: "3", subLabel: "#" },
    "4": { label: "4", subLabel: "$" },
    "5": { label: "5", subLabel: "%" },
    "6": { label: "6", subLabel: "^" },
    "7": { label: "7", subLabel: "&" },
    "8": { label: "8", subLabel: "*" },
    "9": { label: "9", subLabel: "(" },
    "0": { label: "0", subLabel: ")" },
    "-": { label: "-", subLabel: "_" },
    "=": { label: "=", subLabel: "+" },
    bspc: { label: "⌫", subLabel: "Backspace" },

    // Top row
    tab: { label: "Tab" },
    q: { label: "Q" },
    w: { label: "W" },
    e: { label: "E" },
    r: { label: "R" },
    t: { label: "T" },
    y: { label: "Y" },
    u: { label: "U" },
    i: { label: "I" },
    o: { label: "O" },
    p: { label: "P" },
    "[": { label: "[", subLabel: "{" },
    "]": { label: "]", subLabel: "}" },
    "\\": { label: "\\", subLabel: "|" },

    // Home row
    caps: { label: "Caps" },
    a: { label: "A" },
    s: { label: "S" },
    d: { label: "D" },
    f: { label: "F" },
    g: { label: "G" },
    h: { label: "H" },
    j: { label: "J" },
    k: { label: "K" },
    l: { label: "L" },
    ";": { label: ";", subLabel: ":" },
    "'": { label: "'", subLabel: '"' },
    ret: { label: "Enter" },

    // Bottom row
    lsft: { label: "Shift" },
    z: { label: "Z" },
    x: { label: "X" },
    c: { label: "C" },
    v: { label: "V" },
    b: { label: "B" },
    n: { label: "N" },
    m: { label: "M" },
    ",": { label: ",", subLabel: "<" },
    ".": { label: ".", subLabel: ">" },
    "/": { label: "/", subLabel: "?" },
    rsft: { label: "Shift" },

    // Modifier row
    lctl: { label: "Ctrl" },
    lmet: { label: "⌘", subLabel: "Win" },
    lalt: { label: "Alt" },
    spc: { label: "Space" },
    ralt: { label: "Alt" },
    rmet: { label: "⌘", subLabel: "Win" },
    rctl: { label: "Ctrl" },
    menu: { label: "Menu" },

    // Navigation cluster
    ins: { label: "Ins" },
    del: { label: "Del" },
    home: { label: "Home" },
    end: { label: "End" },
    pgup: { label: "PgUp" },
    pgdn: { label: "PgDn" },
    prnt: { label: "PrtSc" },
    slck: { label: "ScrLk" },
    pause: { label: "Pause" },

    // Arrow keys
    up: { label: "↑" },
    down: { label: "↓" },
    left: { label: "←" },
    right: { label: "→" },
  };

/**
 * TKL (Tenkeyless / 80%) keyboard layout.
 * Columns are measured in 0.25u increments for precise positioning.
 */
export const TKL_LAYOUT: KeyDef[] = [
  // Row 0: Function row (with gaps)
  { id: "esc", label: "Esc", width: 1, row: 0, col: 0 },
  // Gap of 1u
  { id: "f1", label: "F1", width: 1, row: 0, col: 2 },
  { id: "f2", label: "F2", width: 1, row: 0, col: 3 },
  { id: "f3", label: "F3", width: 1, row: 0, col: 4 },
  { id: "f4", label: "F4", width: 1, row: 0, col: 5 },
  // Gap of 0.5u
  { id: "f5", label: "F5", width: 1, row: 0, col: 6.5 },
  { id: "f6", label: "F6", width: 1, row: 0, col: 7.5 },
  { id: "f7", label: "F7", width: 1, row: 0, col: 8.5 },
  { id: "f8", label: "F8", width: 1, row: 0, col: 9.5 },
  // Gap of 0.5u
  { id: "f9", label: "F9", width: 1, row: 0, col: 11 },
  { id: "f10", label: "F10", width: 1, row: 0, col: 12 },
  { id: "f11", label: "F11", width: 1, row: 0, col: 13 },
  { id: "f12", label: "F12", width: 1, row: 0, col: 14 },
  // Nav cluster top
  { id: "prnt", label: "PrtSc", width: 1, row: 0, col: 15.25 },
  { id: "slck", label: "ScrLk", width: 1, row: 0, col: 16.25 },
  { id: "pause", label: "Pause", width: 1, row: 0, col: 17.25 },

  // Row 1: Number row
  { id: "grv", label: "`", width: 1, row: 1, col: 0 },
  { id: "1", label: "1", width: 1, row: 1, col: 1 },
  { id: "2", label: "2", width: 1, row: 1, col: 2 },
  { id: "3", label: "3", width: 1, row: 1, col: 3 },
  { id: "4", label: "4", width: 1, row: 1, col: 4 },
  { id: "5", label: "5", width: 1, row: 1, col: 5 },
  { id: "6", label: "6", width: 1, row: 1, col: 6 },
  { id: "7", label: "7", width: 1, row: 1, col: 7 },
  { id: "8", label: "8", width: 1, row: 1, col: 8 },
  { id: "9", label: "9", width: 1, row: 1, col: 9 },
  { id: "0", label: "0", width: 1, row: 1, col: 10 },
  { id: "-", label: "-", width: 1, row: 1, col: 11 },
  { id: "=", label: "=", width: 1, row: 1, col: 12 },
  { id: "bspc", label: "⌫", width: 2, row: 1, col: 13 },
  // Nav cluster
  { id: "ins", label: "Ins", width: 1, row: 1, col: 15.25 },
  { id: "home", label: "Home", width: 1, row: 1, col: 16.25 },
  { id: "pgup", label: "PgUp", width: 1, row: 1, col: 17.25 },

  // Row 2: Top letter row
  { id: "tab", label: "Tab", width: 1.5, row: 2, col: 0 },
  { id: "q", label: "Q", width: 1, row: 2, col: 1.5 },
  { id: "w", label: "W", width: 1, row: 2, col: 2.5 },
  { id: "e", label: "E", width: 1, row: 2, col: 3.5 },
  { id: "r", label: "R", width: 1, row: 2, col: 4.5 },
  { id: "t", label: "T", width: 1, row: 2, col: 5.5 },
  { id: "y", label: "Y", width: 1, row: 2, col: 6.5 },
  { id: "u", label: "U", width: 1, row: 2, col: 7.5 },
  { id: "i", label: "I", width: 1, row: 2, col: 8.5 },
  { id: "o", label: "O", width: 1, row: 2, col: 9.5 },
  { id: "p", label: "P", width: 1, row: 2, col: 10.5 },
  { id: "[", label: "[", width: 1, row: 2, col: 11.5 },
  { id: "]", label: "]", width: 1, row: 2, col: 12.5 },
  { id: "\\", label: "\\", width: 1.5, row: 2, col: 13.5 },
  // Nav cluster
  { id: "del", label: "Del", width: 1, row: 2, col: 15.25 },
  { id: "end", label: "End", width: 1, row: 2, col: 16.25 },
  { id: "pgdn", label: "PgDn", width: 1, row: 2, col: 17.25 },

  // Row 3: Home row
  { id: "caps", label: "Caps", width: 1.75, row: 3, col: 0 },
  { id: "a", label: "A", width: 1, row: 3, col: 1.75 },
  { id: "s", label: "S", width: 1, row: 3, col: 2.75 },
  { id: "d", label: "D", width: 1, row: 3, col: 3.75 },
  { id: "f", label: "F", width: 1, row: 3, col: 4.75 },
  { id: "g", label: "G", width: 1, row: 3, col: 5.75 },
  { id: "h", label: "H", width: 1, row: 3, col: 6.75 },
  { id: "j", label: "J", width: 1, row: 3, col: 7.75 },
  { id: "k", label: "K", width: 1, row: 3, col: 8.75 },
  { id: "l", label: "L", width: 1, row: 3, col: 9.75 },
  { id: ";", label: ";", width: 1, row: 3, col: 10.75 },
  { id: "'", label: "'", width: 1, row: 3, col: 11.75 },
  { id: "ret", label: "Enter", width: 2.25, row: 3, col: 12.75 },

  // Row 4: Bottom letter row
  { id: "lsft", label: "Shift", width: 2.25, row: 4, col: 0 },
  { id: "z", label: "Z", width: 1, row: 4, col: 2.25 },
  { id: "x", label: "X", width: 1, row: 4, col: 3.25 },
  { id: "c", label: "C", width: 1, row: 4, col: 4.25 },
  { id: "v", label: "V", width: 1, row: 4, col: 5.25 },
  { id: "b", label: "B", width: 1, row: 4, col: 6.25 },
  { id: "n", label: "N", width: 1, row: 4, col: 7.25 },
  { id: "m", label: "M", width: 1, row: 4, col: 8.25 },
  { id: ",", label: ",", width: 1, row: 4, col: 9.25 },
  { id: ".", label: ".", width: 1, row: 4, col: 10.25 },
  { id: "/", label: "/", width: 1, row: 4, col: 11.25 },
  { id: "rsft", label: "Shift", width: 2.75, row: 4, col: 12.25 },
  // Arrow up
  { id: "up", label: "↑", width: 1, row: 4, col: 16.25 },

  // Row 5: Modifier row
  { id: "lctl", label: "Ctrl", width: 1.25, row: 5, col: 0 },
  { id: "lmet", label: "⌘", width: 1.25, row: 5, col: 1.25 },
  { id: "lalt", label: "Alt", width: 1.25, row: 5, col: 2.5 },
  { id: "spc", label: "Space", width: 6.25, row: 5, col: 3.75 },
  { id: "ralt", label: "Alt", width: 1.25, row: 5, col: 10 },
  { id: "rmet", label: "⌘", width: 1.25, row: 5, col: 11.25 },
  { id: "menu", label: "Menu", width: 1.25, row: 5, col: 12.5 },
  { id: "rctl", label: "Ctrl", width: 1.25, row: 5, col: 13.75 },
  // Arrow keys
  { id: "left", label: "←", width: 1, row: 5, col: 15.25 },
  { id: "down", label: "↓", width: 1, row: 5, col: 16.25 },
  { id: "right", label: "→", width: 1, row: 5, col: 17.25 },
];

/**
 * Get the label info for a key ID.
 */
export function getKeyLabel(keyId: string): {
  label: string;
  subLabel?: string;
} {
  return KEY_LABELS[keyId] || { label: keyId.toUpperCase() };
}

/**
 * Calculate the total width of the layout in units.
 */
export function getLayoutWidth(layout: KeyDef[]): number {
  return Math.max(...layout.map((k) => k.col + k.width));
}

/**
 * Calculate the total height of the layout in rows.
 */
export function getLayoutHeight(layout: KeyDef[]): number {
  return Math.max(...layout.map((k) => k.row + (k.height || 1))) + 1;
}

/**
 * Get all unique key IDs from the layout.
 */
export function getLayoutKeyIds(layout: KeyDef[]): string[] {
  return layout.filter((k) => !k.isSpacer).map((k) => k.id);
}
