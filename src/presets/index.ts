export type { Preset, PresetMetadata } from "./types";
export {
  STANDARD_SOURCE_KEYS,
  createPassthroughLayer,
  createTransparentLayer,
  createBaseConfig,
} from "./utils";

export { qwertyPreset } from "./qwerty";
export { capsEscapePreset } from "./caps-escape";
export { homerowModsPreset } from "./homerow-mods";
export { spaceNavPreset } from "./space-nav";
export { colemakPreset } from "./colemak";
export { dvorakPreset } from "./dvorak";

import type { Preset } from "./types";
import { qwertyPreset } from "./qwerty";
import { capsEscapePreset } from "./caps-escape";
import { homerowModsPreset } from "./homerow-mods";
import { spaceNavPreset } from "./space-nav";
import { colemakPreset } from "./colemak";
import { dvorakPreset } from "./dvorak";

/**
 * All available presets in display order.
 */
export const ALL_PRESETS: Preset[] = [
  qwertyPreset,
  capsEscapePreset,
  homerowModsPreset,
  spaceNavPreset,
  colemakPreset,
  dvorakPreset,
];

/**
 * Get a preset by its ID.
 */
export function getPresetById(id: string): Preset | undefined {
  return ALL_PRESETS.find((p) => p.metadata.id === id);
}

