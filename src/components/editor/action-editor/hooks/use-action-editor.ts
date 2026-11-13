import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_HOLD_TIMEOUT_MS,
  TRANSPARENT,
  buildKeyAction,
  buildLayerAction,
  parseKeyAction,
  parseLayerAction,
  type LayerMode,
} from "@/kanata/key-action";

export type ActionKind = "key" | "tap-hold" | "layer";

export interface ActionEditorState {
  kind: ActionKind;
  output: string;
  tap: string;
  hold: string;
  timeout: number;
  layer: string;
  layerMode: LayerMode;
}

interface UseActionEditorParams {
  keyId: string;
  layer: string;
  currentAction: string;
  onSave: (action: string) => void;
  otherLayers: string[];
}

function stateFromAction(keyId: string, action: string, otherLayers: string[]): ActionEditorState {
  const parsed = parseKeyAction(action);
  const defaults: ActionEditorState = {
    kind: parsed.kind,
    output: action,
    tap: action === TRANSPARENT ? keyId : action,
    hold: "",
    timeout: DEFAULT_HOLD_TIMEOUT_MS,
    layer: otherLayers[0] ?? "",
    layerMode: "while-held",
  };

  switch (parsed.kind) {
    case "key":
      return defaults;
    case "tap-hold":
      return {
        ...defaults,
        output: parsed.tap,
        tap: parsed.tap,
        hold: parsed.hold,
        timeout: parsed.timeout,
      };
    case "layer":
      return {
        ...defaults,
        output: keyId,
        tap: keyId,
        layer: parsed.layer,
        layerMode: parsed.mode,
      };
  }
}

/** Returns null while the editor is in a state Kanata can't express yet. */
function actionFromState(state: ActionEditorState, keyId: string): string | null {
  switch (state.kind) {
    case "key":
      return state.output || null;
    case "tap-hold":
      // Wait for a hold choice so merely opening this mode doesn't change the key.
      if (!state.hold) return null;
      if (state.hold.startsWith("(layer") && !parseLayerAction(state.hold)) return null;
      return buildKeyAction({
        kind: "tap-hold",
        tap: state.tap || keyId,
        hold: state.hold,
        timeout: state.timeout,
      });
    case "layer":
      return state.layer ? buildLayerAction(state.layerMode, state.layer) : null;
  }
}

/**
 * Keeps the editor's form state in sync with the key's action. Every edit
 * that produces a valid action is saved to the draft config right away.
 */
export function useActionEditor({ keyId, layer, currentAction, onSave, otherLayers }: UseActionEditorParams) {
  const [state, setState] = useState(() => stateFromAction(keyId, currentAction, otherLayers));
  const lastSavedActionRef = useRef(currentAction);
  const editedKeyRef = useRef(`${layer}:${keyId}`);

  useEffect(() => {
    const editedKey = `${layer}:${keyId}`;
    if (editedKey === editedKeyRef.current && currentAction === lastSavedActionRef.current) return;
    editedKeyRef.current = editedKey;
    lastSavedActionRef.current = currentAction;
    setState(stateFromAction(keyId, currentAction, otherLayers));
  }, [keyId, layer, currentAction, otherLayers]);

  const update = (changes: Partial<ActionEditorState>) => {
    const next = { ...state, ...changes };
    setState(next);
    const action = actionFromState(next, keyId);
    if (action && action !== lastSavedActionRef.current) {
      lastSavedActionRef.current = action;
      onSave(action);
    }
  };

  return { state, update };
}
