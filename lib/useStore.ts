"use client";

import { useSyncExternalStore } from "react";
import { getVersion, subscribe } from "./store";

/**
 * Re-renders the component whenever the store changes (in this tab or another).
 * Returns false during server rendering and the first hydration pass, when
 * localStorage isn't available yet.
 */
export function useStore(): boolean {
  const v = useSyncExternalStore(subscribe, getVersion, () => -1);
  return v !== -1;
}
