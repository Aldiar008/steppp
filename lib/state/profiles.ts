/**
 * Named profiles in one browser.
 *
 *     реестр  stepwise-profiles          кто есть и кто активен
 *     данные  stepwise-storage:<id>      отдельный ящик на каждого
 *
 * This is not an account and it never pretends to be one. There is no password,
 * no server, no session: typing a name picks which box in *this* browser to
 * open. Another device shows nothing, and that is stated on the screen rather
 * than discovered later.
 *
 * It exists because the product lost somebody's answers. Looking at the demo
 * overwrote the one profile there was, and there was no way back — a demo is
 * supposed to be the safest button on the screen. Now the demo is a box of its
 * own, standing next to yours instead of on top of it.
 *
 * Everything above the storage line is pure: no clock, no `window`, no
 * randomness. A registry plus an operation always gives the same registry back,
 * which is what makes the awkward cases — the same name twice, a name that is
 * only punctuation — testable instead of hopeful.
 */
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Shape                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A personal box belongs to whoever typed the name. The demo box holds data
 * that is nobody's, so it is marked and never counted as somebody's work.
 */
export type SlotKind = "personal" | "demo";

export interface ProfileSlot {
  id: string;
  first_name: string;
  last_name: string;
  kind: SlotKind;
  /** The `localStorage` key holding this profile's application state. */
  storage_key: string;
  /** ISO instants, supplied by the caller — this module has no clock. */
  created_at: string;
  updated_at: string;
}

export interface ProfileRegistry {
  version: number;
  active_id: string | null;
  slots: ProfileSlot[];
}

export const REGISTRY_KEY = "stepwise-profiles";
export const REGISTRY_VERSION = 1;

/** The fixed id of the demo box, so it can never collide with a person. */
export const DEMO_SLOT_ID = "demo";

/**
 * Where the single-profile builds kept their state.
 *
 * Anybody who used the product before profiles existed has answers under this
 * key. The first slot adopts the key instead of copying it: a copy leaves the
 * original behind to be found again later as a second, stale profile.
 */
export const LEGACY_STORAGE_KEY = "stepwise-storage";

export function storageKeyFor(id: string): string {
  return id === "legacy" ? LEGACY_STORAGE_KEY : `${LEGACY_STORAGE_KEY}:${id}`;
}

export function emptyRegistry(): ProfileRegistry {
  return { version: REGISTRY_VERSION, active_id: null, slots: [] };
}

/* -------------------------------------------------------------------------- */
/* Names                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Two spellings of the same person.
 *
 * Case, stray spaces and the ё/е split are not different people — somebody who
 * typed "Ёрбол" on Monday and "ербол " on Friday means themselves both times,
 * and handing them a second empty profile would be the exact failure this
 * whole file exists to fix.
 */
export function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/\s+/g, " ");
}

/** What a person is called on screen. Never an id, never a key. */
export function displayName(slot: ProfileSlot): string {
  const full = `${slot.first_name} ${slot.last_name}`.trim();
  return full.length > 0 ? full : "Без имени";
}

export function initials(slot: ProfileSlot): string {
  const first = slot.first_name.trim().slice(0, 1);
  const last = slot.last_name.trim().slice(0, 1);
  const both = `${first}${last}`.toLocaleUpperCase("ru");
  return both.length > 0 ? both : "?";
}

/**
 * Is this usable as a name at all?
 *
 * Deliberately permissive — a product for Kazakhstan has no business telling
 * somebody their surname is spelled wrong. It only refuses what cannot identify
 * anyone: nothing, or punctuation alone.
 */
export function isUsableName(value: string): boolean {
  return /\p{L}/u.test(value.trim());
}

/* -------------------------------------------------------------------------- */
/* Registry operations — pure                                                  */
/* -------------------------------------------------------------------------- */

export function findSlot(registry: ProfileRegistry, id: string): ProfileSlot | undefined {
  return registry.slots.find((slot) => slot.id === id);
}

export function activeSlot(registry: ProfileRegistry): ProfileSlot | undefined {
  return registry.active_id === null ? undefined : findSlot(registry, registry.active_id);
}

export function findByName(
  registry: ProfileRegistry,
  firstName: string,
  lastName: string,
): ProfileSlot | undefined {
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);
  return registry.slots.find(
    (slot) =>
      slot.kind === "personal" &&
      normalizeName(slot.first_name) === first &&
      normalizeName(slot.last_name) === last,
  );
}

/** The next free `p<n>`. Counted, not random, so a test can predict it. */
function nextId(registry: ProfileRegistry): string {
  const taken = new Set(registry.slots.map((slot) => slot.id));
  for (let index = 1; index <= taken.size + 1; index += 1) {
    const candidate = `p${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `p${taken.size + 1}`;
}

/**
 * Sign in: the same name comes back to the same box, a new name gets a new one.
 *
 * Returns the registry *and* the slot, because the caller needs to know whether
 * this was a return or a first visit and cannot tell from the registry alone.
 */
export function signIn(
  registry: ProfileRegistry,
  firstName: string,
  lastName: string,
  now: string,
): { registry: ProfileRegistry; slot: ProfileSlot; created: boolean } {
  const existing = findByName(registry, firstName, lastName);
  if (existing !== undefined) {
    return { registry: setActive(touch(registry, existing.id, now), existing.id), slot: existing, created: false };
  }

  const id = nextId(registry);
  const slot: ProfileSlot = {
    id,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    kind: "personal",
    storage_key: storageKeyFor(id),
    created_at: now,
    updated_at: now,
  };

  return {
    registry: { ...registry, active_id: id, slots: [...registry.slots, slot] },
    slot,
    created: true,
  };
}

/** The demo box, created on first use and reused forever after. */
export function ensureDemoSlot(
  registry: ProfileRegistry,
  now: string,
): { registry: ProfileRegistry; slot: ProfileSlot } {
  const existing = findSlot(registry, DEMO_SLOT_ID);
  if (existing !== undefined) return { registry, slot: existing };

  const slot: ProfileSlot = {
    id: DEMO_SLOT_ID,
    first_name: "Демо",
    last_name: "профиль",
    kind: "demo",
    storage_key: storageKeyFor(DEMO_SLOT_ID),
    created_at: now,
    updated_at: now,
  };
  return { registry: { ...registry, slots: [...registry.slots, slot] }, slot };
}

/**
 * Adopts state written before profiles existed.
 *
 * The slot points at the old key rather than copying it, so there is exactly
 * one copy of those answers and no chance of the old one resurfacing as a
 * second profile with a different history.
 */
export function adoptLegacy(registry: ProfileRegistry, now: string): ProfileRegistry {
  if (registry.slots.some((slot) => slot.storage_key === LEGACY_STORAGE_KEY)) return registry;

  const slot: ProfileSlot = {
    id: "legacy",
    first_name: "Мой",
    last_name: "профиль",
    kind: "personal",
    storage_key: LEGACY_STORAGE_KEY,
    created_at: now,
    updated_at: now,
  };
  return { ...registry, active_id: registry.active_id ?? slot.id, slots: [slot, ...registry.slots] };
}

/**
 * Points the registry at a profile, or at nobody.
 *
 * An id with no slot behind it becomes nobody rather than being kept: the
 * sidebar would otherwise show a name with no answers loaded under it, which
 * reads as "your data is gone" when it is only a stale pointer.
 */
export function setActive(registry: ProfileRegistry, id: string | null): ProfileRegistry {
  const target = id !== null && findSlot(registry, id) !== undefined ? id : null;
  return { ...registry, active_id: target };
}

export function touch(registry: ProfileRegistry, id: string, now: string): ProfileRegistry {
  return {
    ...registry,
    slots: registry.slots.map((slot) => (slot.id === id ? { ...slot, updated_at: now } : slot)),
  };
}

export function rename(
  registry: ProfileRegistry,
  id: string,
  firstName: string,
  lastName: string,
  now: string,
): ProfileRegistry {
  return {
    ...registry,
    slots: registry.slots.map((slot) =>
      slot.id === id
        ? { ...slot, first_name: firstName.trim(), last_name: lastName.trim(), updated_at: now }
        : slot,
    ),
  };
}

/** Forgetting a profile also stops it being the active one. */
export function removeSlot(registry: ProfileRegistry, id: string): ProfileRegistry {
  const slots = registry.slots.filter((slot) => slot.id !== id);
  return { ...registry, slots, active_id: registry.active_id === id ? null : registry.active_id };
}

/** Personal profiles, newest activity first. The demo is not somebody's work. */
export function personalSlots(registry: ProfileRegistry): ProfileSlot[] {
  return registry.slots
    .filter((slot) => slot.kind === "personal")
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0));
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

const slotSchema = z.object({
  id: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
  kind: z.enum(["personal", "demo"]),
  storage_key: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string(),
});

const registrySchema = z.object({
  version: z.number(),
  active_id: z.string().nullable(),
  slots: z.array(slotSchema),
});

/**
 * Whatever is in storage, turned into a registry — or an empty one.
 *
 * A browser extension, a half-finished write or a build from the future can all
 * leave something unreadable here. Losing the list of names is survivable and
 * the boxes themselves are untouched; throwing on first paint is not.
 */
export function parseRegistry(raw: unknown): ProfileRegistry {
  const parsed = registrySchema.safeParse(raw);
  if (!parsed.success) return emptyRegistry();
  if (parsed.data.version > REGISTRY_VERSION) return emptyRegistry();

  // An `active_id` pointing at a slot that is gone would leave the app showing
  // a name with no data behind it.
  const registry = parsed.data;
  return setActive(registry, registry.active_id);
}

export function readRegistry(): ProfileRegistry {
  if (typeof window === "undefined") return emptyRegistry();
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    return raw === null ? emptyRegistry() : parseRegistry(JSON.parse(raw));
  } catch {
    return emptyRegistry();
  }
}

export function writeRegistry(registry: ProfileRegistry): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    /* storage full or disabled: the session still works, it just will not survive a reload */
  }
}

/** Removes a profile's data. Called only when somebody asks to forget one. */
export function dropStoredState(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
