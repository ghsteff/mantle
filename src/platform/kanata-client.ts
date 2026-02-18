import type { KanataApi } from "../ipc/kanata-api";

export function getKanataClient(): KanataApi | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.kanata ?? null;
}

export function hasKanataClient() {
  return getKanataClient() !== null;
}
