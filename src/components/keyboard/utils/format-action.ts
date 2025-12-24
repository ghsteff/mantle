import {
  parseMultiModifier,
  AVAILABLE_MODIFIERS,
  findKeyOption,
} from "../../editor/kanata-keys";
import { getKeyLabel } from "./layout";

export interface FormattedAction {
  primary: string;
  secondary?: string;
}

/**
 * Maps modifier keys to their display labels.
 */
const MODIFIER_LABELS: Record<string, string> = {
  lctl: "LCtrl",
  rctl: "RCtrl",
  lsft: "LShift",
  rsft: "RShift",
  lalt: "LAlt",
  ralt: "RAlt",
  lmet: "LCmd",
  rmet: "RCmd",
};

/**
 * Formats a multi-modifier expression to a human-readable string.
 * Example: "(multi lctl lsft lalt)" → "LCtrl + LShift + LAlt"
 */
function formatMultiModifier(multiExpr: string): string {
  const modifiers = parseMultiModifier(multiExpr);
  if (modifiers.length === 0) return multiExpr;

  return modifiers
    .map((m) => {
      // Check AVAILABLE_MODIFIERS first (left-side only)
      const availableMod = AVAILABLE_MODIFIERS.find((am) => am.key === m);
      if (availableMod) {
        return MODIFIER_LABELS[m] || availableMod.label;
      }
      // Handle right-side modifiers - use KEY_LABELS from layout for consistency
      const keyLabel = getKeyLabel(m);
      return MODIFIER_LABELS[m] || keyLabel.label || m;
    })
    .join(" + ");
}

/**
 * Formats a single action value (key or expression) to a display label.
 */
function formatActionValue(value: string): string {
  // Handle multi modifier expressions
  if (value.startsWith("(multi ")) {
    return formatMultiModifier(value);
  }

  // Handle nested expressions (like layer actions in tap-hold)
  if (value.startsWith("(layer-while-held ")) {
    const match = value.match(/\(layer-while-held\s+(\S+)\)/);
    return match ? `${match[1]} (hold)` : value;
  }

  if (value.startsWith("(layer-toggle ")) {
    const match = value.match(/\(layer-toggle\s+(\S+)\)/);
    return match ? `${match[1]} (toggle)` : value;
  }

  if (value.startsWith("(one-shot ")) {
    const match = value.match(/\(one-shot\s+(\S+)\)/);
    return match ? `${match[1]} (one-shot)` : value;
  }

  // Simple key - use KEY_LABELS from layout for consistency
  const keyLabel = getKeyLabel(value);
  return keyLabel.label || value;
}

/**
 * Formats a kanata action string for display on the keyboard grid.
 *
 * Examples:
 * - "esc" → { primary: "Esc" }
 * - "(tap-hold 200 200 esc (multi lctl lsft lalt))" → { primary: "Esc", secondary: "LCtrl + LShift + LAlt" }
 * - "(layer-while-held nav)" → { primary: "nav", secondary: "Layer (hold)" }
 * - "(multi lctl lsft lalt)" → { primary: "LCtrl + LShift + LAlt" }
 * - "_" → { primary: "—" }
 */
export function formatAction(action: string): FormattedAction {
  // Handle transparent
  if (action === "_") {
    return { primary: "—" };
  }

  // Handle tap-hold: (tap-hold timeout1 timeout2 tap hold)
  const tapHoldMatch = action.match(
    /\(tap-hold\s+\d+\s+\d+\s+(\S+|\([^)]+\))\s+(\S+|\([^)]+\))\)/
  );
  if (tapHoldMatch) {
    const tapValue = tapHoldMatch[1];
    const holdValue = tapHoldMatch[2];

    // Format tap value (could be a key or nested expression)
    let tapLabel: string;
    if (tapValue.startsWith("(multi ")) {
      tapLabel = formatMultiModifier(tapValue);
    } else {
      // Use KEY_LABELS for consistency with physical key display
      const keyLabel = getKeyLabel(tapValue);
      tapLabel = keyLabel.label || tapValue;
    }

    // Format hold value
    const holdLabel = formatActionValue(holdValue);

    return {
      primary: tapLabel,
      secondary: holdLabel,
    };
  }

  // Handle layer actions
  const layerHeldMatch = action.match(/\(layer-while-held\s+(\S+)\)/);
  if (layerHeldMatch) {
    return {
      primary: layerHeldMatch[1],
      secondary: "Layer (hold)",
    };
  }

  const layerToggleMatch = action.match(/\(layer-toggle\s+(\S+)\)/);
  if (layerToggleMatch) {
    return {
      primary: layerToggleMatch[1],
      secondary: "Layer (toggle)",
    };
  }

  const oneShotMatch = action.match(/\(one-shot\s+(\S+)\)/);
  if (oneShotMatch) {
    return {
      primary: oneShotMatch[1],
      secondary: "Layer (one-shot)",
    };
  }

  // Handle multi-tap: (multi-tap timeout key1 key2 ...)
  const multiTapMatch = action.match(/\(multi-tap\s+\d+\s+(.+)\)/);
  if (multiTapMatch) {
    const taps = multiTapMatch[1].split(/\s+\d+\s+/).filter(Boolean);
    const labels = taps.map((tap) => {
      const keyLabel = getKeyLabel(tap.trim());
      return keyLabel.label || tap.trim();
    });
    return {
      primary: labels[0] || action,
      secondary: labels.length > 1 ? labels.slice(1).join(", ") : undefined,
    };
  }

  // Handle multi modifier expressions
  if (action.startsWith("(multi ")) {
    return {
      primary: formatMultiModifier(action),
    };
  }

  // Simple key - use KEY_LABELS from layout for consistency with physical key display
  const keyLabel = getKeyLabel(action);
  if (keyLabel.label) {
    return { primary: keyLabel.label };
  }

  // Fallback: try kanata-keys display label
  const option = findKeyOption(action);
  return { primary: option?.label || action };
}
