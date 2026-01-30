// Shared types from central types file
export type {
  KeyboardLayer,
  KeyboardConfig,
  KanataStatus,
  KanataLogEntry,
  ProfileInfo,
} from "../types";

// Types specific to kanata module
export type {
  KeyboardLayerExtended,
  KeyAction,
  TapHoldAction,
  MultiTapAction,
  RemapAction,
  LayerAction,
  StandardKey,
} from "./types";

export {
  STANDARD_QWERTY_KEYS,
  createEmptyLayer,
  createBaseLayer,
} from "./types";

// Generator
export {
  generateKanataConfig,
  actionToString,
  createTapHold,
  createLayerHold,
  createLayerToggle,
  createExampleConfig,
} from "./generator";

// Config Manager
export { ConfigManager, getConfigManager } from "./config-manager";

// Binary Path
export { getKanataBinaryPath } from "./binary-path";

// Process Manager
export type { KanataProcessEvents } from "./process-manager";
export { KanataProcessManager, getProcessManager } from "./process-manager";

// Parser
export type { ParseResult } from "./parser";
export { parseKbdFile, suggestProfileName } from "./parser";
