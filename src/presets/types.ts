import type { KeyboardConfig } from "../kanata/types";

/**
 * Metadata for a keyboard preset.
 */
export interface PresetMetadata {
  /** Unique identifier for the preset */
  id: string;
  /** Display name */
  name: string;
  /** Short description of what this preset does */
  description: string;
  /** Optional icon name (lucide icon) */
  icon?: string;
  /** Category for grouping presets */
  category: "layout" | "modifier" | "layer";
}

/**
 * A preset with its metadata and configuration.
 */
export interface Preset {
  metadata: PresetMetadata;
  config: KeyboardConfig;
}

