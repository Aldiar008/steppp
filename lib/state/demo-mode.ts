"use client";

/**
 * The demo session: a cookie the proxy can see, a synthetic auth status, and
 * a store seeded from `buildAmirAppData()` — never a Supabase row.
 *
 * Isolation is structural, not a convention to remember: nothing in this file
 * ever calls `createClient()` from `@/lib/supabase/client`, so there is no
 * code path by which entering or using demo mode can read or write a real
 * account's data. The store is repointed to its own localStorage key
 * (`stepwise-storage:demo`) exactly like `lib/state/remote-sync.ts` repoints
 * one per real student id — the same mechanism, one more key.
 */
import { useAppStore } from "@/lib/state/app-store";
import { useAuthStore } from "@/lib/state/auth-store";
import { buildAmirAppData } from "@/lib/state/demo-data";

export const DEMO_COOKIE = "stepwise-demo";
const DEMO_STORAGE_KEY = "stepwise-storage:demo";

export function isDemoCookieSet(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((entry) => entry === `${DEMO_COOKIE}=1`);
}

function setDemoCookie(): void {
  // A day is generous for one sitting and short enough that a shared/kiosk
  // browser does not stay "in demo" for a stranger a week later.
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=86400; samesite=lax`;
}

function clearDemoCookie(): void {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Called once per app-shell mount while `status === "demo"` — see `StudentSessionBoot`. */
export function bootDemoData(): void {
  useAppStore.persist.setOptions({ name: DEMO_STORAGE_KEY });
  useAppStore.setState({ ...buildAmirAppData(), hasHydrated: true });
}

/** Undoes `bootDemoData` — called on exit, and defensively whenever a real sign-in replaces a demo session. */
export function stopDemoData(): void {
  useAppStore.persist.setOptions({ name: "stepwise-storage" });
  useAppStore.setState({ ...useAppStore.getState(), hasHydrated: false });
}

/** "Начать демо" — the one entry point. Synchronous: the next navigation already carries the cookie. */
export function enterDemoMode(): void {
  setDemoCookie();
  useAuthStore.getState().setDemo();
}

/** "Выйти из демо" / a real sign-in. */
export function exitDemoMode(): void {
  clearDemoCookie();
  if (typeof window !== "undefined") window.localStorage.removeItem(DEMO_STORAGE_KEY);
  stopDemoData();
  useAuthStore.getState().setSignedOut();
}
