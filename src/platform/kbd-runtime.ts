import { parseKbdFile, suggestProfileName } from "../kanata/parser";
import { invokeTauriCommand, logRuntimeCommandError } from "./runtime-command-result";

export async function exportKbdFromRuntime(profileName: string) {
  const result = await invokeTauriCommand("configExportKbd", { profileName });
  if (!result.success || !result.data) {
    logRuntimeCommandError("Failed to export kbd in tauri runtime", result);
    return { success: false, error: "Failed to export" };
  }

  return result.data;
}

export async function importKbdFromRuntime() {
  const result = await invokeTauriCommand("configImportKbd");
  if (!result.success || !result.data) {
    logRuntimeCommandError("Failed to import kbd in tauri runtime", result);
    return { success: false, error: "Failed to import" };
  }

  if (!result.data.success) {
    return {
      success: false,
      error: result.data.error ?? "Failed to import",
    };
  }

  if (!result.data.content) {
    return { success: false, error: "Failed to read import file" };
  }

  const parseResult = parseKbdFile(result.data.content);
  if (!parseResult.success) {
    return parseResult;
  }

  return {
    success: true,
    config: parseResult.config,
    suggestedName: result.data.filePath
      ? suggestProfileName(result.data.filePath)
      : "imported",
  };
}
