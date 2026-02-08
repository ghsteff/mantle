import { useState, useEffect, useRef, useCallback } from "react";

export type ActionType = "simple" | "tap-hold" | "layer";
export type HoldType = "key" | "layer";

interface ActionEditorState {
  actionType: ActionType;
  simpleKey: string;
  tapKey: string;
  holdKey: string;
  holdLayer: string;
  holdLayerMode: "momentary" | "toggle";
  timeout: number;
  layerName: string;
  layerMode: "momentary" | "toggle" | "one-shot";
}

interface UseActionEditorParams {
  keyId: string;
  currentAction: string;
  onSave: (action: string) => void;
  layers: string[];
}

function isMultiExpression(value: string): boolean {
  return value.startsWith("(multi ");
}

function isHoldKeyEmpty(value: string): boolean {
  return !value || value.trim() === "";
}

function buildAction(state: ActionEditorState): string {
  switch (state.actionType) {
    case "simple":
      return state.simpleKey;
    case "tap-hold": {
      const tapValue = state.tapKey;
      if (state.holdKey && !isHoldKeyEmpty(state.holdKey)) {
        if (isMultiExpression(state.holdKey)) {
          return `(tap-hold ${state.timeout} ${state.timeout} ${tapValue} ${state.holdKey})`;
        }
        return `(tap-hold ${state.timeout} ${state.timeout} ${tapValue} ${state.holdKey})`;
      }
      return tapValue;
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

function createInitialState(
  keyId: string,
  layers: string[],
  simpleKey = keyId,
  tapKey = keyId
): ActionEditorState {
  return {
    actionType: "simple",
    simpleKey,
    tapKey,
    holdKey: "",
    holdLayer: layers[1] || layers[0] || "",
    holdLayerMode: "momentary",
    timeout: 200,
    layerName: layers[0] || "",
    layerMode: "momentary",
  };
}

function buildStateFromAction(
  keyId: string,
  currentAction: string,
  layers: string[]
): ActionEditorState {
  const baseState = createInitialState(
    keyId,
    layers,
    currentAction ?? keyId,
    currentAction ?? keyId
  );

  if (currentAction === "_" || currentAction === keyId) {
    return {
      ...baseState,
      actionType: "simple",
      simpleKey: currentAction,
      tapKey: currentAction,
    };
  }

  if (isMultiExpression(currentAction) && !currentAction.includes("tap-hold")) {
    return {
      ...baseState,
      actionType: "simple",
      simpleKey: currentAction,
      tapKey: currentAction,
    };
  }

  const tapHoldMatch = currentAction.match(
    /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\([^)]+\))\s+(\S+|\([^)]+\))\)/
  );
  if (tapHoldMatch) {
    const tapValue = tapHoldMatch[2];
    const holdValue = tapHoldMatch[3];

    if (holdValue.startsWith("(layer-while-held ")) {
      const layerMatch = holdValue.match(/\(layer-while-held\s+(\S+)\)/);
      const layerName = layerMatch ? layerMatch[1] : baseState.holdLayer;
      return {
        ...baseState,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldMatch[1]),
        tapKey: tapValue,
        holdKey: `(layer-while-held ${layerName})`,
        holdLayer: layerName,
        holdLayerMode: "momentary",
      };
    }

    if (holdValue.startsWith("(layer-toggle ")) {
      const layerMatch = holdValue.match(/\(layer-toggle\s+(\S+)\)/);
      const layerName = layerMatch ? layerMatch[1] : baseState.holdLayer;
      return {
        ...baseState,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldMatch[1]),
        tapKey: tapValue,
        holdKey: `(layer-toggle ${layerName})`,
        holdLayer: layerName,
        holdLayerMode: "toggle",
      };
    }

    return {
      ...baseState,
      actionType: "tap-hold",
      timeout: parseInt(tapHoldMatch[1]),
      tapKey: tapValue,
      holdKey: holdValue,
    };
  }

  const layerHeldMatch = currentAction.match(/\(layer-while-held\s+(\S+)\)/);
  if (layerHeldMatch) {
    return {
      ...baseState,
      actionType: "layer",
      layerName: layerHeldMatch[1],
      layerMode: "momentary",
    };
  }

  const layerToggleMatch = currentAction.match(/\(layer-toggle\s+(\S+)\)/);
  if (layerToggleMatch) {
    return {
      ...baseState,
      actionType: "layer",
      layerName: layerToggleMatch[1],
      layerMode: "toggle",
    };
  }

  return {
    ...baseState,
    actionType: "simple",
    simpleKey: currentAction,
    tapKey: currentAction,
  };
}

export function useActionEditor({
  keyId,
  currentAction,
  onSave,
  layers,
}: UseActionEditorParams) {
  const [state, setState] = useState<ActionEditorState>(() =>
    buildStateFromAction(keyId, currentAction ?? keyId, layers)
  );

  const lastSavedAction = useRef<string>(currentAction);
  const lastKeyId = useRef<string>(keyId);
  const isInitializing = useRef(true);
  const hasUserEdits = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const updateState = useCallback((updates: Partial<ActionEditorState>) => {
    hasUserEdits.current = true;
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    const isKeyChange = lastKeyId.current !== keyId;
    const isExternalUpdate = currentAction !== lastSavedAction.current;

    if (!isKeyChange && !isExternalUpdate) return;

    isInitializing.current = true;
    hasUserEdits.current = false;
    lastSavedAction.current = currentAction;
    lastKeyId.current = keyId;

    setState(buildStateFromAction(keyId, currentAction, layers));
  }, [currentAction, keyId, layers]);

  useEffect(() => {
    if (isInitializing.current) {
      if (!hasUserEdits.current) {
        isInitializing.current = false;
        return;
      }
      isInitializing.current = false;
    }

    const action = buildAction(state);

    if (action !== lastSavedAction.current) {
      lastSavedAction.current = action;
      onSaveRef.current(action);
    }
    hasUserEdits.current = false;
  }, [state]);

  return {
    ...state,
    setActionType: useCallback(
      (actionType: ActionType) => updateState({ actionType }),
      [updateState]
    ),
    setSimpleKey: useCallback(
      (simpleKey: string) => updateState({ simpleKey }),
      [updateState]
    ),
    setTapKey: useCallback(
      (tapKey: string) => updateState({ tapKey }),
      [updateState]
    ),
    setHoldKey: useCallback(
      (holdKey: string) => updateState({ holdKey }),
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
