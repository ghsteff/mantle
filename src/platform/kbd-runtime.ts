import type { ExportResult } from "../types";
import { parseKbdFile, suggestProfileName } from "../kanata/parser";
import { getKanataClient } from "./kanata-client";
import { isTauriRuntime } from "./runtime-environment";

interface TauriImportKbdResult {
  success: boolean;
  filePath?: string;
  content?: string;
  error?: string;
}

export async function exportKbdFromRuntime() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.exportKbd();
  }

  if (!isTauriRuntime()) {
    return { success: false, error: "Not running in desktop runtime" };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<ExportResult>("config_export_kbd");
  } catch (error) {
    console.warn("Failed to export kbd in tauri runtime", error);
    return { success: false, error: "Failed to export" };
  }
}

export async function importKbdFromRuntime() {
  const kanataClient = getKanataClient();
  if (kanataClient) {
    return kanataClient.importKbd();
  }

  if (!isTauriRuntime()) {
    return { success: false, error: "Not running in desktop runtime" };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<TauriImportKbdResult>("config_import_kbd");

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "Failed to import",
      };
    }

    if (!result.content) {
      return { success: false, error: "Failed to read import file" };
    }

    const parseResult = parseKbdFile(result.content);
    if (!parseResult.success) {
      return parseResult;
    }

    return {
      success: true,
      config: parseResult.config,
      suggestedName: result.filePath ? suggestProfileName(result.filePath) : "imported",
    };
  } catch (error) {
    console.warn("Failed to import kbd in tauri runtime", error);
    return { success: false, error: "Failed to import" };
  }
}
