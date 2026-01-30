import { app } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import type { KeyboardConfig, ProfileInfo } from "../types";
import { generateKanataConfig, createExampleConfig } from "./generator";
import { parseKbdFile, type ParseResult } from "./parser";

/**
 * Structure of the profiles.json file.
 */
interface ProfilesData {
  activeProfile: string;
  profiles: ProfileInfo[];
}

/**
 * Manages the Kanata configuration files and profiles.
 * Supports multiple named profiles, each with its own configuration.
 */
export class ConfigManager {
  private configDir: string;
  private profilesPath: string;
  private kbdConfigPath: string;

  constructor() {
    // Store configs in the user's app data directory
    this.configDir = path.join(app.getPath("userData"), "kanata");
    this.profilesPath = path.join(this.configDir, "profiles.json");
    this.kbdConfigPath = path.join(this.configDir, "kanata.kbd");

    // Ensure the config directory exists
    this.ensureConfigDir();
  }

  /**
   * Ensures the config directory exists, creating it if necessary.
   */
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Gets the path to a profile's config file.
   */
  private getProfileConfigPath(profileName: string): string {
    return path.join(this.configDir, `config-${profileName}.json`);
  }

  /**
   * Gets the path to the generated .kbd config file.
   */
  getKbdConfigPath(): string {
    return this.kbdConfigPath;
  }

  /**
   * Gets the config directory path.
   */
  getConfigDir(): string {
    return this.configDir;
  }

  // ============================================
  // Profile Management
  // ============================================

  /**
   * Loads the profiles data from disk.
   */
  private loadProfilesData(): ProfilesData | null {
    try {
      if (!fs.existsSync(this.profilesPath)) {
        return null;
      }
      const content = fs.readFileSync(this.profilesPath, "utf-8");
      return JSON.parse(content) as ProfilesData;
    } catch (error) {
      console.error("Failed to load profiles data:", error);
      return null;
    }
  }

  /**
   * Saves the profiles data to disk.
   */
  private saveProfilesData(data: ProfilesData): void {
    this.ensureConfigDir();
    fs.writeFileSync(this.profilesPath, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Lists all saved profiles.
   */
  listProfiles(): ProfileInfo[] {
    const data = this.loadProfilesData();
    return data?.profiles ?? [];
  }

  /**
   * Gets the name of the active profile.
   */
  getActiveProfileName(): string | null {
    const data = this.loadProfilesData();
    return data?.activeProfile ?? null;
  }

  /**
   * Checks if any profiles exist.
   */
  hasProfiles(): boolean {
    const data = this.loadProfilesData();
    return data !== null && data.profiles.length > 0;
  }

  /**
   * Creates a new profile with the given configuration.
   * Returns true if successful, false if a profile with that name already exists.
   */
  createProfile(name: string, config: KeyboardConfig): boolean {
    const data = this.loadProfilesData() ?? { activeProfile: "", profiles: [] };
    
    // Check if profile already exists
    if (data.profiles.some((p) => p.name === name)) {
      console.error(`Profile "${name}" already exists`);
      return false;
    }

    const now = new Date().toISOString();
    const profileInfo: ProfileInfo = {
      name,
      createdAt: now,
      updatedAt: now,
    };

    // Add to profiles list
    data.profiles.push(profileInfo);
    
    // Set as active if it's the first profile
    if (data.profiles.length === 1) {
      data.activeProfile = name;
    }

    // Save profiles metadata
    this.saveProfilesData(data);

    // Save the profile's config
    const configPath = this.getProfileConfigPath(name);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    // If this is the active profile, regenerate the kbd file
    if (data.activeProfile === name) {
      this.regenerateKbdFile(config);
    }

    return true;
  }

  /**
   * Switches to a different profile.
   * Returns the config of the new active profile, or null if the profile doesn't exist.
   */
  switchProfile(name: string): KeyboardConfig | null {
    const data = this.loadProfilesData();
    if (!data) return null;

    // Check if profile exists
    if (!data.profiles.some((p) => p.name === name)) {
      console.error(`Profile "${name}" does not exist`);
      return null;
    }

    // Load the profile's config
    const config = this.loadProfileConfig(name);
    if (!config) return null;

    // Update active profile
    data.activeProfile = name;
    this.saveProfilesData(data);

    // Regenerate kbd file for new active profile
    this.regenerateKbdFile(config);

    return config;
  }

  /**
   * Deletes a profile.
   * Cannot delete the last remaining profile or the active profile (unless it's the only one).
   */
  deleteProfile(name: string): boolean {
    const data = this.loadProfilesData();
    if (!data) return false;

    const profileIndex = data.profiles.findIndex((p) => p.name === name);
    if (profileIndex === -1) {
      console.error(`Profile "${name}" does not exist`);
      return false;
    }

    // Can't delete if it's the only profile
    if (data.profiles.length === 1) {
      console.error("Cannot delete the last profile");
      return false;
    }

    // Remove from profiles list
    data.profiles.splice(profileIndex, 1);

    // If deleting the active profile, switch to another one
    if (data.activeProfile === name) {
      data.activeProfile = data.profiles[0].name;
    }

    // Save profiles metadata
    this.saveProfilesData(data);

    // Delete the profile's config file
    const configPath = this.getProfileConfigPath(name);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    return true;
  }

  /**
   * Renames a profile.
   */
  renameProfile(oldName: string, newName: string): boolean {
    const data = this.loadProfilesData();
    if (!data) return false;

    const profile = data.profiles.find((p) => p.name === oldName);
    if (!profile) {
      console.error(`Profile "${oldName}" does not exist`);
      return false;
    }

    if (data.profiles.some((p) => p.name === newName)) {
      console.error(`Profile "${newName}" already exists`);
      return false;
    }

    // Rename in profiles list
    profile.name = newName;
    profile.updatedAt = new Date().toISOString();

    // Update active profile if needed
    if (data.activeProfile === oldName) {
      data.activeProfile = newName;
    }

    // Save profiles metadata
    this.saveProfilesData(data);

    // Rename config file
    const oldPath = this.getProfileConfigPath(oldName);
    const newPath = this.getProfileConfigPath(newName);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }

    return true;
  }

  // ============================================
  // Config Management (for active profile)
  // ============================================

  /**
   * Loads a specific profile's configuration.
   */
  private loadProfileConfig(profileName: string): KeyboardConfig | null {
    try {
      const configPath = this.getProfileConfigPath(profileName);
      if (!fs.existsSync(configPath)) {
        return null;
      }
      const content = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(content) as KeyboardConfig;
      return this.migrateConfig(config);
    } catch (error) {
      console.error(`Failed to load config for profile "${profileName}":`, error);
      return null;
    }
  }

  /**
   * Loads the keyboard configuration for the active profile.
   * Returns null if no profiles exist.
   */
  loadConfig(): KeyboardConfig | null {
    const activeProfile = this.getActiveProfileName();
    if (!activeProfile) {
      // Migration: check for legacy config.json
      return this.migrateLegacyConfig();
    }
    return this.loadProfileConfig(activeProfile);
  }

  /**
   * Migrates old single-config setup to profiles system.
   */
  private migrateLegacyConfig(): KeyboardConfig | null {
    const legacyPath = path.join(this.configDir, "config.json");
    if (!fs.existsSync(legacyPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(legacyPath, "utf-8");
      const config = JSON.parse(content) as KeyboardConfig;
      
      // Create a default profile with the legacy config
      this.createProfile("default", config);
      
      // Rename legacy file to backup
      const backupPath = path.join(this.configDir, "config-legacy-backup.json");
      fs.renameSync(legacyPath, backupPath);
      
      return config;
    } catch (error) {
      console.error("Failed to migrate legacy config:", error);
      return null;
    }
  }

  /**
   * Migrates old configs to include new keys (e.g., function row).
   */
  private migrateConfig(config: KeyboardConfig): KeyboardConfig {
    const functionRow = ["esc", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"];

    // Check if function row is missing
    if (!config.sourceKeys.includes("esc") && !config.sourceKeys.includes("f1")) {
      config.sourceKeys = [...functionRow, ...config.sourceKeys];
      
      for (const layer of config.layers) {
        for (const key of functionRow) {
          if (!(key in layer.keys)) {
            layer.keys[key] = layer.name === "base" ? key : "_";
          }
        }
      }
    }
    
    return config;
  }

  /**
   * Saves the keyboard configuration for the active profile.
   */
  saveConfig(config: KeyboardConfig): void {
    const activeProfile = this.getActiveProfileName();
    if (!activeProfile) {
      console.error("No active profile to save to");
      return;
    }

    this.ensureConfigDir();

    // Update the profile's updatedAt timestamp
    const data = this.loadProfilesData();
    if (data) {
      const profile = data.profiles.find((p) => p.name === activeProfile);
      if (profile) {
        profile.updatedAt = new Date().toISOString();
        this.saveProfilesData(data);
      }
    }

    // Save the profile's config
    const configPath = this.getProfileConfigPath(activeProfile);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    // Regenerate kbd file
    this.regenerateKbdFile(config);
  }

  /**
   * Regenerates the .kbd file from a config.
   */
  private regenerateKbdFile(config: KeyboardConfig): void {
    const kbdContent = generateKanataConfig(config);
    fs.writeFileSync(this.kbdConfigPath, kbdContent, "utf-8");
  }

  /**
   * Checks if any configuration exists (profiles or legacy).
   */
  configExists(): boolean {
    if (this.hasProfiles()) return true;
    // Check for legacy config
    const legacyPath = path.join(this.configDir, "config.json");
    return fs.existsSync(legacyPath);
  }

  /**
   * Creates a default configuration if none exists.
   * Returns the config (either loaded or newly created).
   * @deprecated Use loadConfig() and createProfile() instead
   */
  loadOrCreateDefault(): KeyboardConfig {
    const existing = this.loadConfig();
    if (existing) {
      return existing;
    }

    // Create and save the example config as default profile
    const defaultConfig = createExampleConfig();
    this.createProfile("default", defaultConfig);
    return defaultConfig;
  }

  // ============================================
  // Backup Management
  // ============================================

  /**
   * Backs up the current active profile's configuration.
   */
  backupConfig(): string | null {
    const activeProfile = this.getActiveProfileName();
    if (!activeProfile) return null;

    const configPath = this.getProfileConfigPath(activeProfile);
    if (!fs.existsSync(configPath)) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
      this.configDir,
      `backup-${activeProfile}-${timestamp}.json`
    );

    try {
      fs.copyFileSync(configPath, backupPath);
      return backupPath;
    } catch (error) {
      console.error("Failed to create backup:", error);
      return null;
    }
  }

  /**
   * Lists all backup files.
   */
  listBackups(): string[] {
    try {
      const files = fs.readdirSync(this.configDir);
      return files
        .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
        .map((f) => path.join(this.configDir, f))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * Restores a configuration from a backup file to the active profile.
   */
  restoreBackup(backupPath: string): boolean {
    try {
      if (!fs.existsSync(backupPath)) return false;

      const content = fs.readFileSync(backupPath, "utf-8");
      const config = JSON.parse(content) as KeyboardConfig;

      if (!config.sourceKeys || !config.layers) return false;

      this.saveConfig(config);
      return true;
    } catch (error) {
      console.error("Failed to restore backup:", error);
      return false;
    }
  }

  /**
   * Deletes old backups, keeping only the most recent N backups.
   */
  cleanupBackups(keepCount = 10): void {
    const backups = this.listBackups();
    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup);
      } catch (error) {
        console.error(`Failed to delete backup ${backup}:`, error);
      }
    }
  }

  /**
   * Gets the path to the JSON config file for the active profile.
   * @deprecated Use getActiveProfileName() instead
   */
  getJsonConfigPath(): string {
    const activeProfile = this.getActiveProfileName();
    if (!activeProfile) {
      // Return legacy path for backwards compatibility
      return path.join(this.configDir, "config.json");
    }
    return this.getProfileConfigPath(activeProfile);
  }

  // ============================================
  // Import/Export
  // ============================================

  /**
   * Exports the current profile's .kbd file to a specified path.
   * Returns true if successful.
   */
  exportKbdFile(targetPath: string): boolean {
    try {
      if (!fs.existsSync(this.kbdConfigPath)) {
        console.error("No .kbd file exists to export");
        return false;
      }

      fs.copyFileSync(this.kbdConfigPath, targetPath);
      return true;
    } catch (error) {
      console.error("Failed to export .kbd file:", error);
      return false;
    }
  }

  /**
   * Imports a .kbd file and returns the parsed configuration.
   * Does not create a profile - that should be done separately.
   */
  importKbdFile(sourcePath: string): ParseResult {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: "File does not exist" };
      }

      const content = fs.readFileSync(sourcePath, "utf-8");
      return parseKbdFile(content);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read file",
      };
    }
  }
}

// Singleton instance
let configManagerInstance: ConfigManager | null = null;

/**
 * Gets the singleton ConfigManager instance.
 * Note: Should only be called after app.whenReady() in the main process.
 */
export function getConfigManager(): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
  }
  return configManagerInstance;
}
