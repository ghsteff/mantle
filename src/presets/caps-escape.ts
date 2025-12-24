import type { Preset } from "./types";
import { STANDARD_SOURCE_KEYS, createPassthroughLayer } from "./utils";

/**
 * Caps Lock as Escape/Control preset.
 * - Tap Caps Lock → Escape
 * - Hold Caps Lock → Control
 */
export const capsEscapePreset: Preset = {
  metadata: {
    id: "caps-escape",
    name: "Caps as Escape/Ctrl",
    description: "Tap Caps Lock for Escape, hold for Control",
    icon: "ArrowUpFromDot",
    category: "modifier",
  },
  config: {
    sourceKeys: [...STANDARD_SOURCE_KEYS],
    layers: [
      {
        ...createPassthroughLayer("base"),
        keys: {
          ...createPassthroughLayer("base").keys,
          caps: "(tap-hold 200 200 esc lctl)",
        },
      },
    ],
  },
};
