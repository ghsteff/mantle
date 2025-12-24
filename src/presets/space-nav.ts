import type { Preset } from "./types";
import {
  STANDARD_SOURCE_KEYS,
  createPassthroughLayer,
  createTransparentLayer,
} from "./utils";

/**
 * Space Navigation Layer preset.
 * - Tap Space → Space
 * - Hold Space → Activate navigation layer
 * - Navigation layer: HJKL become arrow keys, plus other nav keys
 */
export const spaceNavPreset: Preset = {
  metadata: {
    id: "space-nav",
    name: "Space Nav Layer",
    description: "Hold Space for arrow keys on HJKL",
    icon: "Navigation",
    category: "layer",
  },
  config: {
    sourceKeys: [...STANDARD_SOURCE_KEYS],
    layers: [
      {
        ...createPassthroughLayer("base"),
        keys: {
          ...createPassthroughLayer("base").keys,
          spc: "(tap-hold 200 200 spc (layer-while-held nav))",
        },
      },
      {
        ...createTransparentLayer("nav"),
        keys: {
          ...createTransparentLayer("nav").keys,
          // Vim-style arrow keys
          h: "left",
          j: "down",
          k: "up",
          l: "right",
          // Additional navigation
          u: "pgup",
          d: "pgdn",
          "0": "home",
          "4": "end", // $ in vim
          // Word navigation (with modifiers in the nav layer)
          w: "C-right", // Forward word
          b: "C-left", // Back word
        },
      },
    ],
  },
};
