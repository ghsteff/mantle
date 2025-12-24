import type { Preset } from "./types";
import { createBaseConfig } from "./utils";

/**
 * Default QWERTY preset - all keys pass through unchanged.
 */
export const qwertyPreset: Preset = {
  metadata: {
    id: "qwerty",
    name: "QWERTY (Default)",
    description: "Standard keyboard layout with no modifications",
    icon: "Keyboard",
    category: "layout",
  },
  config: createBaseConfig(),
};

