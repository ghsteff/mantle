import { app } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import type { KeyboardConfig } from "./types";
import { generateKanataConfig, createExampleConfig } from "./generator";

/**
 * Manages the Kanata configuration files.
 * Handles reading/writing both the JSON config and the generated .kbd file.
 */
export class ConfigManager {
  private configDir: string;
  private jsonConfigPath: string;
  private kbdConfigPath: string;

  constructor() {
    // Store configs in the user's app data directory
    this.configDir = path.join(app.getPath("userData"), "kanata");
    this.jsonConfigPath = path.join(this.configDir, "config.json");
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
   * Gets the path to the generated .kbd config file.
   */
  getKbdConfigPath(): string {
    return this.kbdConfigPath;
  }

  /**
   * Gets the path to the JSON config file.
   */
  getJsonConfigPath(): string {
    return this.jsonConfigPath;
  }

  /**
   * Gets the config directory path.
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Loads the keyboard configuration from the JSON file.
   * Returns null if the file doesn't exist or can't be parsed.
   * Migrates old configs to include function row if missing.
   */
  loadConfig(): KeyboardConfig | null {
    try {
      if (!fs.existsSync(this.jsonConfigPath)) {
        return null;
      }
      const content = fs.readFileSync(this.jsonConfigPath, "utf-8");
      const config = JSON.parse(content) as KeyboardConfig;
      
      // Migrate: add function row if missing
      return this.migrateConfig(config);
    } catch (error) {
      console.error("Failed to load config:", error);
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
      console.log("[ConfigManager] Migrating config to add function row");
      
      // Add function row to beginning of sourceKeys
      config.sourceKeys = [...functionRow, ...config.sourceKeys];
      
      // Add function row keys to each layer
      for (const layer of config.layers) {
        for (const key of functionRow) {
          if (!(key in layer.keys)) {
            // Default to passthrough on base layer, transparent on others
            layer.keys[key] = layer.name === "base" ? key : "_";
          }
        }
      }
      
      // Save migrated config
      this.saveConfig(config);
    }
    
    return config;
  }

  /**
   * Saves the keyboard configuration to both JSON and .kbd files.
   */
  saveConfig(config: KeyboardConfig): void {
    this.ensureConfigDir();

    // Save the JSON config for the UI
    fs.writeFileSync(this.jsonConfigPath, JSON.stringify(config, null, 2), "utf-8");

    // Generate and save the .kbd file for Kanata
    const kbdContent = generateKanataConfig(config);
    fs.writeFileSync(this.kbdConfigPath, kbdContent, "utf-8");
  }

  /**
   * Checks if a configuration exists.
   */
  configExists(): boolean {
    return fs.existsSync(this.jsonConfigPath);
  }

  /**
   * Creates a default configuration if none exists.
   * Returns the config (either loaded or newly created).
   */
  loadOrCreateDefault(): KeyboardConfig {
    const existing = this.loadConfig();
    if (existing) {
      return existing;
    }

    // Create and save the example config
    const defaultConfig = createExampleConfig();
    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * Backs up the current configuration before making changes.
   */
  backupConfig(): string | null {
    if (!this.configExists()) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(this.configDir, `config-backup-${timestamp}.json`);

    try {
      fs.copyFileSync(this.jsonConfigPath, backupPath);
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
        .filter((f) => f.startsWith("config-backup-") && f.endsWith(".json"))
        .map((f) => path.join(this.configDir, f))
        .sort()
        .reverse(); // Most recent first
    } catch {
      return [];
    }
  }

  /**
   * Restores a configuration from a backup file.
   */
  restoreBackup(backupPath: string): boolean {
    try {
      if (!fs.existsSync(backupPath)) {
        return false;
      }

      const content = fs.readFileSync(backupPath, "utf-8");
      const config = JSON.parse(content) as KeyboardConfig;

      // Validate it's a valid config before restoring
      if (!config.sourceKeys || !config.layers) {
        return false;
      }

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

