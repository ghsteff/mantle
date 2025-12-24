import { getKeyLabel } from "@/components/keyboard/utils/layout";
import {
  parseMultiModifier,
  AVAILABLE_MODIFIERS,
} from "@/components/editor/kanata-keys";

interface ActionDetails {
  type: string;
  tap?: string;
  hold?: string;
}

/**
 * Parses an action string to extract structured details for tooltip display.
 */
export function parseActionDetails(action: string): ActionDetails {
  // Handle transparent
  if (action === "_") {
    return { type: "Transparent" };
  }

  // Handle tap-hold: (tap-hold timeout1 timeout2 tap hold)
  const tapHoldMatch = action.match(
    /\(tap-hold\s+\d+\s+\d+\s+(\S+|\([^)]+\))\s+(\S+|\([^)]+\))\)/
  );
  if (tapHoldMatch) {
    const tapValue = tapHoldMatch[1];
    const holdValue = tapHoldMatch[2];

    // Format tap value
    let tapLabel: string;
    if (tapValue.startsWith("(multi ")) {
      const modifiers = parseMultiModifier(tapValue);
      tapLabel = modifiers
        .map((m) => {
          const mod = AVAILABLE_MODIFIERS.find((am) => am.key === m);
          return mod?.label || getKeyLabel(m).label || m;
        })
        .join(" + ");
    } else {
      tapLabel = getKeyLabel(tapValue).label || tapValue;
    }

    // Format hold value
    let holdLabel: string;
    if (holdValue.startsWith("(multi ")) {
      const modifiers = parseMultiModifier(holdValue);
      holdLabel = modifiers
        .map((m) => {
          const mod = AVAILABLE_MODIFIERS.find((am) => am.key === m);
          return mod?.label || getKeyLabel(m).label || m;
        })
        .join(" + ");
    } else if (holdValue.startsWith("(layer-while-held ")) {
      const match = holdValue.match(/\(layer-while-held\s+(\S+)\)/);
      holdLabel = match ? match[1] : holdValue;
    } else if (holdValue.startsWith("(layer-toggle ")) {
      const match = holdValue.match(/\(layer-toggle\s+(\S+)\)/);
      holdLabel = match ? match[1] : holdValue;
    } else if (holdValue.startsWith("(one-shot ")) {
      const match = holdValue.match(/\(one-shot\s+(\S+)\)/);
      holdLabel = match ? match[1] : holdValue;
    } else {
      holdLabel = getKeyLabel(holdValue).label || holdValue;
    }

    return {
      type: "Tap-Hold",
      tap: tapLabel,
      hold: holdLabel,
    };
  }

  // Handle layer actions
  const layerHeldMatch = action.match(/\(layer-while-held\s+(\S+)\)/);
  if (layerHeldMatch) {
    return {
      type: "Layer (Hold)",
      tap: layerHeldMatch[1],
    };
  }

  const layerToggleMatch = action.match(/\(layer-toggle\s+(\S+)\)/);
  if (layerToggleMatch) {
    return {
      type: "Layer (Toggle)",
      tap: layerToggleMatch[1],
    };
  }

  const oneShotMatch = action.match(/\(one-shot\s+(\S+)\)/);
  if (oneShotMatch) {
    return {
      type: "Layer (One-Shot)",
      tap: oneShotMatch[1],
    };
  }

  // Handle multi-tap
  const multiTapMatch = action.match(/\(multi-tap\s+\d+\s+(.+)\)/);
  if (multiTapMatch) {
    const taps = multiTapMatch[1].split(/\s+\d+\s+/).filter(Boolean);
    const labels = taps.map(
      (tap) => getKeyLabel(tap.trim()).label || tap.trim()
    );
    return {
      type: "Multi-Tap",
      tap: labels.join(", "),
    };
  }

  // Handle multi modifier expressions
  if (action.startsWith("(multi ")) {
    const modifiers = parseMultiModifier(action);
    const label = modifiers
      .map((m) => {
        const mod = AVAILABLE_MODIFIERS.find((am) => am.key === m);
        return mod?.label || getKeyLabel(m).label || m;
      })
      .join(" + ");
    return {
      type: "Multi-Modifier",
      tap: label,
    };
  }

  // Simple key
  const keyLabel = getKeyLabel(action);
  return {
    type: "Simple Key",
    tap: keyLabel.label || action,
  };
}
