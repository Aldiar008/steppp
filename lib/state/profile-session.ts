"use client";

/**
 * Pointing the application state at one profile's box.
 *
 * `lib/state/profiles.ts` decides *who* exists; this decides *whose data is
 * loaded right now*. It is the only place that moves the persist middleware
 * from one `localStorage` key to another, and the only place that has to get
 * the order right:
 *
 *     1. read the target box                 ← before anything is written
 *     2. point the store at the target key
 *     3. put the target's data into the store
 *
 * Reading first is not fussiness. Zustand's persist writes on every state
 * change, so setting the key and *then* clearing the store would save an empty
 * profile over a real one before it had ever been read — silently deleting
 * exactly the answers this feature exists to protect.
 */
import type { StorageValue } from "zustand/middleware";

import {
  activeSlot,
  adoptLegacy,
  emptyRegistry,
  LEGACY_STORAGE_KEY,
  readRegistry,
  writeRegistry,
  type ProfileRegistry,
  type ProfileSlot,
} from "./profiles";
import { createDefaultAppData, migrateAppState, useAppStore, type AppData } from "./app-store";

/** What the persist middleware is reading and writing at this moment. */
export function currentStorageKey(): string {
  return useAppStore.persist.getOptions().name ?? LEGACY_STORAGE_KEY;
}

function readBox(key: string): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as StorageValue<AppData>;
    return migrateAppState(parsed.state, parsed.version ?? 0);
  } catch {
    // Unreadable is the same as empty: the person gets a clean profile rather
    // than a crash, and nothing else in storage is touched.
    return null;
  }
}

/**
 * Loads one profile's data into the running application.
 *
 * Optional fields are cleared by name because `setState` merges: the defaults
 * simply omit `selected_door_id` and `last_edit`, so without this the previous
 * profile's selection would survive into the next one.
 */
export function activateSlot(slot: ProfileSlot): void {
  const box = readBox(slot.storage_key);

  useAppStore.persist.setOptions({ name: slot.storage_key });
  useAppStore.setState({
    ...(box ?? createDefaultAppData()),
    selected_door_id: box?.selected_door_id,
    last_edit: box?.last_edit,
    hasHydrated: true,
  });
}

/**
 * Did somebody actually use this box, or is it just scaffolding?
 *
 * The persist middleware writes its defaults to storage on the very first
 * paint, so "the key exists" is true for a browser that has never seen the
 * product. Adopting on that would hand every first-time visitor a profile
 * called «Мой профиль» before they had typed anything — the sign-in screen
 * would never appear.
 */
function holdsAnswers(box: AppData | null): boolean {
  if (box === null) return false;
  return box.profile !== null || box.interview.started || box.completed_action_ids.length > 0;
}

/**
 * Run once per page load, before any screen reads the store.
 *
 * Also the upgrade path: state written before profiles existed is adopted as
 * the first slot rather than copied, so there is one set of answers and not two
 * diverging ones.
 */
let booted = false;

export function bootProfiles(now: string): ProfileRegistry {
  if (typeof window === "undefined") return emptyRegistry();
  if (booted) return readRegistry();
  booted = true;

  let registry = readRegistry();
  if (registry.slots.length === 0 && holdsAnswers(readBox(LEGACY_STORAGE_KEY))) {
    registry = adoptLegacy(registry, now);
    writeRegistry(registry);
  }

  const active = activeSlot(registry);
  if (active !== undefined && active.storage_key !== currentStorageKey()) activateSlot(active);

  return registry;
}

/** Test seam: lets a test boot a fresh window without reloading the module. */
export function resetBootForTests(): void {
  booted = false;
}
