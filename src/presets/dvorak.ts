import type { Preset } from "./types";
import { STANDARD_SOURCE_KEYS, createPassthroughLayer } from "./utils";

/**
 * Dvorak layout preset.
 * Remaps keys from QWERTY to Dvorak positions.
 * 
 * QWERTY: q w e r t y u i o p [ ]
 * Dvorak: ' , . p y f g c r l / =
 * 
 * QWERTY: a s d f g h j k l ; '
 * Dvorak: a o e u i d h t n s -
 * 
 * QWERTY: z x c v b n m , . /
 * Dvorak: ; q j k x b m w v z
 */
export const dvorakPreset: Preset = {
  metadata: {
    id: "dvorak",
    name: "Dvorak",
    description: "Dvorak keyboard layout optimized for English typing",
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
          // Top row remaps (q w e r t y u i o p [ ])
          q: "'",
          w: ",",
          e: ".",
          r: "p",
          t: "y",
          y: "f",
          u: "g",
          i: "c",
          o: "r",
          p: "l",
          "[": "/",
          "]": "=",
          // Home row remaps (a s d f g h j k l ; ')
          // a stays a
          s: "o",
          d: "e",
          f: "u",
          g: "i",
          // h stays h (but actually d in Dvorak)
          h: "d",
          // j stays h in Dvorak
          j: "h",
          k: "t",
          l: "n",
          ";": "s",
          "'": "-",
          // Bottom row remaps (z x c v b n m , . /)
          z: ";",
          x: "q",
          c: "j",
          v: "k",
          b: "x",
          n: "b",
          // m stays m
          ",": "w",
          ".": "v",
          "/": "z",
        },
      },
    ],
  },
};

