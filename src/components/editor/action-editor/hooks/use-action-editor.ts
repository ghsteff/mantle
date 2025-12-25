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
  layers: string[]
): ActionEditorState {
  return {
    actionType: "simple",
    simpleKey: keyId,
    tapKey: keyId,
    holdKey: "",
    holdLayer: layers[1] || layers[0] || "",
    holdLayerMode: "momentary",
    timeout: 200,
    layerName: layers[0] || "",
    layerMode: "momentary",
  };
}

export function useActionEditor({
  keyId,
  currentAction,
  onSave,
  layers,
}: UseActionEditorParams) {
  const [state, setState] = useState<ActionEditorState>(() =>
    createInitialState(keyId, layers)
  );

  const lastSavedAction = useRef<string>(currentAction);
  const isInitializing = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const updateState = useCallback((updates: Partial<ActionEditorState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    isInitializing.current = true;
    lastSavedAction.current = currentAction;

    if (currentAction === "_" || currentAction === keyId) {
      setState((prev) => ({
        ...prev,
        actionType: "simple",
        simpleKey: currentAction,
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    if (
      isMultiExpression(currentAction) &&
      !currentAction.includes("tap-hold")
    ) {
      setState((prev) => ({
        ...prev,
        actionType: "simple",
        simpleKey: currentAction,
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    const tapHoldLayerMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+\(layer-while-held\s+(\S+)\)\)/
    );
    if (tapHoldLayerMatch) {
      const tapValue = tapHoldLayerMatch[2];
      setState((prev) => ({
        ...prev,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldLayerMatch[1]),
        tapKey: tapValue,
        holdKey: `(layer-while-held ${tapHoldLayerMatch[3]})`,
        holdLayer: tapHoldLayerMatch[3],
        holdLayerMode: "momentary",
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    const tapHoldToggleMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+\(layer-toggle\s+(\S+)\)\)/
    );
    if (tapHoldToggleMatch) {
      const tapValue = tapHoldToggleMatch[2];
      setState((prev) => ({
        ...prev,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldToggleMatch[1]),
        tapKey: tapValue,
        holdKey: `(layer-toggle ${tapHoldToggleMatch[3]})`,
        holdLayer: tapHoldToggleMatch[3],
        holdLayerMode: "toggle",
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    const tapHoldMultiMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+(\(multi\s+[^)]+\))\)/
    );
    if (tapHoldMultiMatch) {
      const tapValue = tapHoldMultiMatch[2];
      setState((prev) => ({
        ...prev,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldMultiMatch[1]),
        tapKey: tapValue,
        holdKey: tapHoldMultiMatch[3],
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

    const tapHoldMatch = currentAction.match(
      /\(tap-hold\s+(\d+)\s+\d+\s+(\S+|\(multi[^)]+\))\s+(\S+)\)/
    );
    if (tapHoldMatch) {
      const tapValue = tapHoldMatch[2];
      setState((prev) => ({
        ...prev,
        actionType: "tap-hold",
        timeout: parseInt(tapHoldMatch[1]),
        tapKey: tapValue,
        holdKey: tapHoldMatch[3],
      }));
      window.setTimeout(() => {
        isInitializing.current = false;
      }, 0);
      return;
    }

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

    setState((prev) => ({
      ...prev,
      actionType: "simple",
      simpleKey: currentAction,
    }));
    window.setTimeout(() => {
      isInitializing.current = false;
    }, 0);
  }, [currentAction, keyId]);

  useEffect(() => {
    if (isInitializing.current) return;

    const action = buildAction(state);

    if (action !== lastSavedAction.current) {
      lastSavedAction.current = action;
      onSaveRef.current(action);
    }
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
