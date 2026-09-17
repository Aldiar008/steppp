"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Media query as an external store.
 *
 * `useSyncExternalStore` rather than an effect, for the same reason as
 * `useHydrated`: the server and the client genuinely have different answers,
 * and the project bans setState inside effect bodies.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  // The server cannot know the viewport, so it always answers "no".
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
