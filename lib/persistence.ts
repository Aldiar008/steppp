import type { PersistStorage, StorageValue } from "zustand/middleware";

/**
 * The persistence seam.
 *
 * Today the applicant profile lives in the browser, because the product asks a
 * sixteen-year-old for answers before it has earned the right to ask for an
 * account. When a server store is added (Supabase rows keyed by auth user id),
 * only this file changes: implement the same interface, swap it in `store.ts`,
 * and the engine, the screens, and the tests stay untouched.
 */
export const STORAGE_KEY = "stepwise.v2";

export function createLocalStorage<T>(): PersistStorage<T> {
  return {
    getItem: (name) => {
      if (typeof window === "undefined") return null;
      try {
        const raw = window.localStorage.getItem(name);
        return raw ? (JSON.parse(raw) as StorageValue<T>) : null;
      } catch {
        // A corrupted or quota-blocked store must not take the app down.
        return null;
      }
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(name, JSON.stringify(value));
      } catch {
        /* storage full or disabled: the session still works, it just will not survive a reload */
      }
    },
    removeItem: (name) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}
