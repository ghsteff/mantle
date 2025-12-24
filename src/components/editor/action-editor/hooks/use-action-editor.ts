import { useState, useEffect, useRef, useCallback } from "react";

export type ActionType = "simple" | "tap-hold" | "layer";
export type KeyType = "key" | "multi";
export type HoldType = "key" | "multi" | "layer";

interface ActionEditorState {
  actionType: ActionType;
  // Simple action state
  simpleKeyType: KeyType;
  simpleKey: string;
  simpleMultiKeys: string;
  // Tap-hold state
  tapKeyType: KeyType;
  tapKey: string;
  tapMultiKeys: string;
  holdType: HoldType;
  holdKey: string;
  holdMultiKeys: string;
  holdLayer: string;
  holdLayerMode: "momentary" | "toggle";
  timeout: number;
  // Layer action state
  layerName: string;
  layerMode: "momentary" | "toggle" | "one-shot";
}

interface UseActionEditorParams {
  keyId: string;
  currentAction: string;
  onSave: (action: string) => void;
  layers: string[];
}

/**
 * Check if a value is a multi expression
 */
function isMultiExpression(value: string): boolean {
  return value.startsWith("(multi ");
}

/**
 * Build action string from current state
 */
function buildAction(state: ActionEditorState): string {
  switch (state.actionType) {
    case "simple":
      return state.simpleKeyType === "key"
        ? state.simpleKey
        : state.simpleMultiKeys;
    case "tap-hold": {
      const tapValue =
        state.tapKeyType === "key" ? state.tapKey : state.tapMultiKeys;
      if (state.holdType === "key") {
        return `(tap-hold ${state.timeout} ${state.timeout} ${tapValue} ${state.holdKey})`;
      } else if (state.holdType === "multi") {
        return `(tap-hold ${state.timeout} ${state.timeout} ${tapValue} ${state.holdMultiKeys})`;
      } else {
        const layerAction =
          state.holdLayerMode === "momentary"
            ? `(layer-while-held ${state.holdLayer})`
            : `(layer-toggle ${state.holdLayer})`;
        return `(tap-hold ${state.timeout} ${state.timeout} ${tapValue} ${layerAction})`;
      }
    }
    case "layer":
      switch (state.layerMode) {
        case "momentary":
          return `(layer-while-held ${state.layerName})`;
        case "toggle":
          return `(layer-toggle ${state.layerName})`;
        case "one-shot":
          return `(one-shot ${state.layerName})`;
      }
  }
}

/**
 * Create initial state
 */
function createInitialState(
  keyId: string,
  layers: string[]
): ActionEditorState {
  return {
    actionType: "simple",
    simpleKeyType: "key",
    simpleKey: keyId,
    simpleMultiKeys: "(multi lctl c)",
    tapKeyType: "key",
    tapKey: keyId,
    tapMultiKeys: "(multi lctl c)",
    holdType: "key",
    holdKey: "lctl",
    holdMultiKeys: "(multi lctl lsft lalt)",
    holdLayer: layers[1] || layers[0] || "",
    holdLayerMode: "momentary",
    timeout: 200,
    layerName: layers[0] || "",
    layerMode: "momentary",
  };
}

/**
 * Hook for managing action editor state and auto-saving.
 * Parses incoming actions and automatically saves changes as the user edits.
 */
export function useActionEditor({
  keyId,
  currentAction,
  onSave,
  layers,
}: UseActionEditorParams) {
  const [state, setState] = useState<ActionEditorState>(() =>
    createInitialState(keyId, layers)
  );

  // Track the last action we saved to avoid duplicate saves
  const lastSavedAction = useRef<string>(currentAction);
  // Track if we're initializing from currentAction (to avoid saving during parse)
  const isInitializing = useRef(true);
  // Stable ref to onSave to avoid re-triggering effects
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Helper to update state with partial updates
  const updateState = useCallback((updates: Partial<ActionEditorState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Parse current action when it changes (e.g., selecting a different key)
  useEffect(() => {
    isInitializing.current = true;
    lastSavedAction.current = currentAction;

    if (currentAction === "_" || currentAction === keyId) {
      setState((prev) => ({
        ...prev,
        actionType: "simple",
        simpleKeyType: "key",
        simpleKey: currentAction,
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    // Check if it's a simple multi expression (not inside tap-hold)
    if (
      isMultiExpression(currentAction) &&
      !currentAction.includes("tap-hold")
    ) {
      setState((prev) => ({
        ...prev,
        actionType: "simple",
        simpleKeyType: "multi",
        simpleMultiKeys: currentAction,
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    // Try to parse tap-hold with layer: (tap-hold 200 200 spc (layer-while-held nav))
    const tapHoldLayerMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+\(layer-while-held\s+(\S+)\)\)/
    );
    if (tapHoldLayerMatch) {
      const tapValue = tapHoldLayerMatch[2];
      setState((prev) => ({
        ...prev,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldLayerMatch[1]),
        tapKeyType: isMultiExpression(tapValue) ? "multi" : "key",
        tapKey: isMultiExpression(tapValue) ? prev.tapKey : tapValue,
        tapMultiKeys: isMultiExpression(tapValue)
          ? tapValue
          : prev.tapMultiKeys,
        holdType: "layer",
        holdLayer: tapHoldLayerMatch[3],
        holdLayerMode: "momentary",
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    // Try to parse tap-hold with layer-toggle: (tap-hold 200 200 spc (layer-toggle nav))
    const tapHoldToggleMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+\(layer-toggle\s+(\S+)\)\)/
    );
    if (tapHoldToggleMatch) {
      const tapValue = tapHoldToggleMatch[2];
      setState((prev) => ({
        ...prev,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldToggleMatch[1]),
        tapKeyType: isMultiExpression(tapValue) ? "multi" : "key",
        tapKey: isMultiExpression(tapValue) ? prev.tapKey : tapValue,
        tapMultiKeys: isMultiExpression(tapValue)
          ? tapValue
          : prev.tapMultiKeys,
        holdType: "layer",
        holdLayer: tapHoldToggleMatch[3],
        holdLayerMode: "toggle",
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    // Try to parse tap-hold with multi hold: (tap-hold 200 200 esc (multi lctl lsft lalt))
    const tapHoldMultiMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+(\(multi\s+[^)]+\))\)/
    );
    if (tapHoldMultiMatch) {
      const tapValue = tapHoldMultiMatch[2];
      setState((prev) => ({
        ...prev,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldMultiMatch[1]),
        tapKeyType: isMultiExpression(tapValue) ? "multi" : "key",
        tapKey: isMultiExpression(tapValue) ? prev.tapKey : tapValue,
        tapMultiKeys: isMultiExpression(tapValue)
          ? tapValue
          : prev.tapMultiKeys,
        holdType: "multi",
        holdMultiKeys: tapHoldMultiMatch[3],
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    // Try to parse simple tap-hold: (tap-hold 200 200 esc lctl)
    const tapHoldMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+(\S+)\)/
    );
    if (tapHoldMatch) {
      const tapValue = tapHoldMatch[2];
      setState((prev) => ({
        ...prev,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldMatch[1]),
        tapKeyType: isMultiExpression(tapValue) ? "multi" : "key",
        tapKey: isMultiExpression(tapValue) ? prev.tapKey : tapValue,
        tapMultiKeys: isMultiExpression(tapValue)
          ? tapValue
          : prev.tapMultiKeys,
        holdType: "key",
        holdKey: tapHoldMatch[3],
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    // Try to parse layer actions
    const layerHeldMatch = currentAction.match(/\(layer-while-held\s+(\S+)\)/);
    if (layerHeldMatch) {
      setState((prev) => ({
        ...prev,
        actionType: "layer",
        layerName: layerHeldMatch[1],
        layerMode: "momentary",
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    const layerToggleMatch = currentAction.match(/\(layer-toggle\s+(\S+)\)/);
    if (layerToggleMatch) {
      setState((prev) => ({
        ...prev,
        actionType: "layer",
        layerName: layerToggleMatch[1],
        layerMode: "toggle",
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    // Default: treat as simple key
    setState((prev) => ({
      ...prev,
      actionType: "simple",
      simpleKeyType: "key",
      simpleKey: currentAction,
    }));
    window.setTimeout(() => {
      isInitializing.current = false;
    }, 0);
  }, [currentAction, keyId]);

  // Auto-save whenever any editor value changes
  useEffect(() => {
    if (isInitializing.current) return;

    const action = buildAction(state);

    // Only save if the action actually changed from what we last saved
    if (action !== lastSavedAction.current) {
      lastSavedAction.current = action;
      onSaveRef.current(action);
    }
  }, [state]);

  // Create individual setters for convenience
  return {
    // State
    ...state,
    // Setters
    setActionType: useCallback(
      (actionType: ActionType) => updateState({ actionType }),
      [updateState]
    ),
    setSimpleKeyType: useCallback(
      (simpleKeyType: KeyType) => updateState({ simpleKeyType }),
      [updateState]
    ),
    setSimpleKey: useCallback(
      (simpleKey: string) => updateState({ simpleKey }),
      [updateState]
    ),
    setSimpleMultiKeys: useCallback(
      (simpleMultiKeys: string) => updateState({ simpleMultiKeys }),
      [updateState]
    ),
    setTapKeyType: useCallback(
      (tapKeyType: KeyType) => updateState({ tapKeyType }),
      [updateState]
    ),
    setTapKey: useCallback(
      (tapKey: string) => updateState({ tapKey }),
      [updateState]
    ),
    setTapMultiKeys: useCallback(
      (tapMultiKeys: string) => updateState({ tapMultiKeys }),
      [updateState]
    ),
    setHoldType: useCallback(
      (holdType: HoldType) => updateState({ holdType }),
      [updateState]
    ),
    setHoldKey: useCallback(
      (holdKey: string) => updateState({ holdKey }),
      [updateState]
    ),
    setHoldMultiKeys: useCallback(
      (holdMultiKeys: string) => updateState({ holdMultiKeys }),
      [updateState]
    ),
    setHoldLayer: useCallback(
      (holdLayer: string) => updateState({ holdLayer }),
      [updateState]
    ),
    setHoldLayerMode: useCallback(
      (holdLayerMode: "momentary" | "toggle") => updateState({ holdLayerMode }),
      [updateState]
    ),
    setTimeout: useCallback(
      (timeout: number) => updateState({ timeout }),
      [updateState]
    ),
    setLayerName: useCallback(
      (layerName: string) => updateState({ layerName }),
      [updateState]
    ),
    setLayerMode: useCallback(
      (layerMode: "momentary" | "toggle" | "one-shot") =>
        updateState({ layerMode }),
      [updateState]
    ),
  };
}
