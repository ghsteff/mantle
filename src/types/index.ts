/**
 * Shared type definitions used across the application.
 * This is the single source of truth for types used in both
 * main process and renderer process.
 */

// ============================================
// Keyboard Configuration Types
// ============================================

/**
 * Represents a single layer in the keyboard configuration.
 * Each layer maps physical keys to their actions.
 */
export interface KeyboardLayer {
  name: string;
  keys: Record<string, string>;
}

/**
 * The complete keyboard configuration.
 */
export interface KeyboardConfig {
  /** The source keys layout (physical keyboard) */
  sourceKeys: string[];
  /** All configured layers */
  layers: KeyboardLayer[];
  /** Optional: define aliases for complex actions */
  aliases?: Record<string, string>;
}

// ============================================
// Kanata Process Types
// ============================================

/**
 * Status of the Kanata process.
 */
export type KanataStatus = "stopped" | "starting" | "running" | "error";

/**
 * A log entry from the Kanata process.
 */
export interface KanataLogEntry {
  type: "stdout" | "stderr";
  message: string;
  timestamp: number;
}

/**
 * Information about a process crash.
 */
export interface CrashInfo {
  code: number | null;
  signal: string | null;
}

// ============================================
// Profile Types
// ============================================

/**
 * Metadata for a saved profile.
 */
export interface ProfileInfo {
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Config Paths and Results
// ============================================

/**
 * Paths to configuration files.
 */
export interface ConfigPaths {
  json: string;
  kbd: string;
  dir: string;
}

/**
 * Result of exporting a .kbd file.
 */
export interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Result of importing a .kbd file.
 */
export interface ImportResult {
  success: boolean;
  config?: KeyboardConfig;
  suggestedName?: string;
  error?: string;
}

// ============================================
// Karabiner Types
// ============================================

/**
 * Status of Karabiner installation.
 */
export interface KarabinerStatus {
  driverInstalled: boolean;
  appInstalled: boolean;
  pkgDownloaded: boolean;
  homebrewInstalled: boolean;
  pkgPath: string | null;
}

/**
 * Result of Karabiner installation.
 */
export interface KarabinerInstallResult {
  success: boolean;
  error?: string;
}
