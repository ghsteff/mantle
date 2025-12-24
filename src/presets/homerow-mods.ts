import type { Preset } from "./types";
import { STANDARD_SOURCE_KEYS, createPassthroughLayer } from "./utils";

/**
 * Homerow Mods preset.
 * Home row keys become modifiers when held:
 * - A → Control (tap A, hold Ctrl)
 * - S → Alt/Option (tap S, hold Alt)
 * - D → Command/Super (tap D, hold Cmd)
 * - F → Shift (tap F, hold Shift)
 * - J → Shift (tap J, hold Shift)
 * - K → Command/Super (tap K, hold Cmd)
 * - L → Alt/Option (tap L, hold Alt)
 * - ; → Control (tap ;, hold Ctrl)
 */
export const homerowModsPreset: Preset = {
  metadata: {
    id: "homerow-mods",
    name: "Homerow Mods",
    description: "ASDF/JKL; become Ctrl/Alt/Cmd/Shift when held",
    icon: "Rows3",
    category: "modifier",
  },
  config: {
    sourceKeys: [...STANDARD_SOURCE_KEYS],
    layers: [
      {
        ...createPassthroughLayer("base"),
        keys: {
          ...createPassthroughLayer("base").keys,
          // Left hand homerow mods: Ctrl, Alt, Cmd, Shift
          a: "(tap-hold 200 200 a lctl)",
          s: "(tap-hold 200 200 s lalt)",
          d: "(tap-hold 200 200 d lmet)",
          f: "(tap-hold 200 200 f lsft)",
          // Right hand homerow mods (mirrored): Shift, Cmd, Alt, Ctrl
          j: "(tap-hold 200 200 j rsft)",
          k: "(tap-hold 200 200 k rmet)",
          l: "(tap-hold 200 200 l ralt)",
          ";": "(tap-hold 200 200 ; rctl)",
        },
      },
    ],
  },
};
