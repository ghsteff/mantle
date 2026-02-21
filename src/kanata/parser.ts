import type { KeyboardConfig, KeyboardLayer } from "./types";

/**
 * Result of parsing a .kbd file.
 */
export interface ParseResult {
  success: boolean;
  config?: KeyboardConfig;
  error?: string;
}

/**
 * Parses a Kanata .kbd configuration file into a KeyboardConfig object.
 *
 * This parser handles:
 * - (defsrc ...) blocks for source keys
 * - (deflayer name ...) blocks for layers
 * - (defalias ...) blocks for aliases (can appear multiple times)
 * - Comments (lines starting with ;;)
 */
export function parseKbdFile(content: string): ParseResult {
  try {
    // Remove comments and normalize whitespace
    const cleanContent = removeComments(content);

    // Extract blocks
    const defsrcBlock = extractBlock(cleanContent, "defsrc");
    const deflayerBlocks = extractAllBlocks(cleanContent, "deflayer");
    const defaliasBlocks = extractAllBlocks(cleanContent, "defalias");

    if (!defsrcBlock) {
      return { success: false, error: "No (defsrc) block found in file" };
    }

    if (deflayerBlocks.length === 0) {
      return { success: false, error: "No (deflayer) blocks found in file" };
    }

    // Parse source keys
    const sourceKeys = parseTokens(defsrcBlock);
    if (sourceKeys.length === 0) {
      return { success: false, error: "Empty (defsrc) block" };
    }

    // Parse layers
    const layers: KeyboardLayer[] = [];
    for (const layerBlock of deflayerBlocks) {
      const layer = parseLayer(layerBlock, sourceKeys);
      if (!layer) {
        return {
          success: false,
          error: `Failed to parse layer: ${layerBlock.substring(0, 50)}...`,
        };
      }
      layers.push(layer);
    }

    // Parse aliases
    let aliases: Record<string, string> | undefined;
    if (defaliasBlocks.length > 0) {
      // Deterministic merge: later blocks overwrite earlier aliases.
      aliases = defaliasBlocks.reduce<Record<string, string>>((acc, block) => {
        return { ...acc, ...parseAliases(block) };
      }, {});
    }

    const config: KeyboardConfig = {
      sourceKeys,
      layers,
      ...(aliases && Object.keys(aliases).length > 0 ? { aliases } : {}),
    };

    return { success: true, config };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown parsing error",
    };
  }
}

/**
 * Removes comments from the content.
 * Comments start with ;; and continue to end of line.
 */
function removeComments(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const commentIndex = line.indexOf(";;");
      if (commentIndex !== -1) {
        return line.substring(0, commentIndex);
      }
      return line;
    })
    .join("\n");
}

/**
 * Extracts a single block by name, e.g., (defsrc ...) or (defalias ...).
 * Returns the content inside the parentheses (excluding the block name).
 */
function extractBlock(content: string, blockName: string): string | null {
  const pattern = new RegExp(`\\(${blockName}\\b`, "i");
  const match = content.match(pattern);
  if (!match || match.index === undefined) {
    return null;
  }

  const startIndex = match.index;
  let depth = 0;
  let endIndex = startIndex;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === "(") {
      depth++;
    } else if (content[i] === ")") {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (depth !== 0) {
    return null;
  }

  // Extract content between the block name and closing paren
  const fullBlock = content.substring(startIndex, endIndex + 1);
  // Remove the opening (blockName and closing )
  const innerContent = fullBlock
    .replace(new RegExp(`^\\(${blockName}\\s*`, "i"), "")
    .replace(/\)$/, "");

  return innerContent.trim();
}

/**
 * Extracts all blocks of a given type (for deflayer which can appear multiple times).
 */
function extractAllBlocks(content: string, blockName: string): string[] {
  const blocks: string[] = [];
  const pattern = new RegExp(`\\(${blockName}\\b`, "gi");
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const startIndex = match.index;
    let depth = 0;
    let endIndex = startIndex;

    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === "(") {
        depth++;
      } else if (content[i] === ")") {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (depth === 0) {
      const fullBlock = content.substring(startIndex, endIndex + 1);
      // Remove the opening (blockName and closing )
      const innerContent = fullBlock
        .replace(new RegExp(`^\\(${blockName}\\s*`, "i"), "")
        .replace(/\)$/, "");
      blocks.push(innerContent.trim());
    }
  }

  return blocks;
}

/**
 * Parses tokens from a block content, handling nested parentheses.
 * Returns an array of tokens where nested expressions are kept as single tokens.
 */
function parseTokens(content: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
      if (depth === 0 && current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else if (/\s/.test(char) && depth === 0) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

/**
 * Parses a deflayer block into a KeyboardLayer.
 * The first token is the layer name, followed by actions for each source key.
 */
function parseLayer(
  layerContent: string,
  sourceKeys: string[]
): KeyboardLayer | null {
  const tokens = parseTokens(layerContent);
  if (tokens.length === 0) {
    return null;
  }

  const name = tokens[0];
  const actions = tokens.slice(1);

  // The number of actions should match the number of source keys
  if (actions.length !== sourceKeys.length) {
    console.warn(
      `Layer "${name}" has ${actions.length} actions but expected ${sourceKeys.length}`
    );
    // Still try to parse, padding with "_" if needed
  }

  const keys: Record<string, string> = {};
  for (let i = 0; i < sourceKeys.length; i++) {
    keys[sourceKeys[i]] = actions[i] ?? "_";
  }

  return { name, keys };
}

/**
 * Parses a defalias block into a Record of alias name to action.
 * Format: name1 action1 name2 action2 ...
 */
function parseAliases(aliasContent: string): Record<string, string> {
  const tokens = parseTokens(aliasContent);
  const aliases: Record<string, string> = {};

  // Aliases come in pairs: name action
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const name = tokens[i];
    const action = tokens[i + 1];
    if (name && action) {
      aliases[name] = action;
    }
  }

  return aliases;
}

/**
 * Suggests a profile name based on the file path.
 */
export function suggestProfileName(filePath: string): string {
  // Extract filename without extension
  const parts = filePath.split(/[/\\]/);
  const filename = parts[parts.length - 1] || "imported";
  const nameWithoutExt = filename.replace(/\.kbd$/i, "");

  // Clean up the name
  return nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "imported";
}
