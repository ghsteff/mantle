import type { Preset } from "./types";
import { STANDARD_SOURCE_KEYS, createPassthroughLayer } from "./utils";

/**
 * Colemak layout preset.
 * Remaps letter keys from QWERTY to Colemak positions.
 * 
 * QWERTY: q w e r t y u i o p
 * Colemak: q w f p g j l u y ;
 * 
 * QWERTY: a s d f g h j k l ;
 * Colemak: a r s t d h n e i o
 * 
 * QWERTY: z x c v b n m
 * Colemak: z x c v b k m
 */
export const colemakPreset: Preset = {
  metadata: {
    id: "colemak",
    name: "Colemak",
    description: "Colemak keyboard layout for improved typing ergonomics",
    icon: "LayoutGrid",
    category: "layout",
  },
  config: {
    sourceKeys: [...STANDARD_SOURCE_KEYS],
    layers: [
      {
        ...createPassthroughLayer("base"),
        keys: {
          ...createPassthroughLayer("base").keys,
          // Top row remaps
          e: "f",
          r: "p",
          t: "g",
          y: "j",
          u: "l",
          i: "u",
          o: "y",
          p: ";",
          // Home row remaps
          s: "r",
          d: "s",
          f: "t",
          g: "d",
          // h stays h
          j: "n",
          k: "e",
          l: "i",
          ";": "o",
          // Bottom row remaps
          n: "k",
          // m stays m
        },
      },
    ],
  },
};

