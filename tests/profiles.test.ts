import { beforeEach, describe, expect, it } from "vitest";

import { DEMO_PROFILE } from "@/data/demo-profile";
import { createDefaultAppData, useAppStore } from "@/lib/state/app-store";
import { useProfileStore } from "@/lib/state/profile-store";
import { activateSlot, resetBootForTests } from "@/lib/state/profile-session";
import {
  adoptLegacy,
  emptyRegistry,
  ensureDemoSlot,
  findByName,
  isUsableName,
  LEGACY_STORAGE_KEY,
  parseRegistry,
  personalSlots,
  removeSlot,
  signIn,
  type ProfileRegistry,
} from "@/lib/state/profiles";
import type { Profile } from "@/lib/types";

/**
 * Named profiles in one browser.
 *
 * The feature exists because of one bug: looking at the demo overwrote the only
 * profile there was, and there was no way back. Most of what follows is about
 * making sure that cannot happen again — the rest is the awkward cases a person
 * will actually hit, like typing their own name slightly differently.
 */

const NOW = "2026-09-17T10:00:00.000Z";
const LATER = "2026-09-18T10:00:00.000Z";

describe("the registry", () => {
  it("brings the same name back to the same profile", () => {
    const first = signIn(emptyRegistry(), "Ербол", "Ниязбек", NOW);
    expect(first.created).toBe(true);

    // The same person, typed the way people actually type: different case,
    // a stray space, and ё where they wrote е last time.
    const again = signIn(first.registry, "  ёрбол", "НИЯЗБЕК ", LATER);
    expect(again.created).toBe(false);
    expect(again.slot.id).toBe(first.slot.id);
    expect(again.registry.slots).toHaveLength(1);
  });

  it("gives a different person a different box", () => {
    const first = signIn(emptyRegistry(), "Ербол", "Ниязбек", NOW);
    const second = signIn(first.registry, "Айгерим", "Ниязбек", NOW);

    expect(second.created).toBe(true);
    expect(second.slot.id).not.toBe(first.slot.id);
    expect(second.slot.storage_key).not.toBe(first.slot.storage_key);
    expect(second.registry.active_id).toBe(second.slot.id);
  });

  it("numbers profiles predictably rather than randomly", () => {
    const a = signIn(emptyRegistry(), "А", "", NOW);
    const b = signIn(a.registry, "Б", "", NOW);
    expect([a.slot.id, b.slot.id]).toEqual(["p1", "p2"]);
  });

  it("keeps the demo out of the list of people", () => {
    const signed = signIn(emptyRegistry(), "Ербол", "", NOW);
    const withDemo = ensureDemoSlot(signed.registry, NOW);

    expect(withDemo.slot.kind).toBe("demo");
    expect(personalSlots(withDemo.registry).map((slot) => slot.id)).toEqual(["p1"]);

    // Asking twice does not create a second demo.
    const again = ensureDemoSlot(withDemo.registry, LATER);
    expect(again.registry.slots).toHaveLength(2);
  });

  it("stops pointing at a profile that was forgotten", () => {
    const signed = signIn(emptyRegistry(), "Ербол", "", NOW);
    const after = removeSlot(signed.registry, signed.slot.id);

    expect(after.slots).toHaveLength(0);
    expect(after.active_id).toBeNull();
  });

  it("adopts pre-profile state instead of copying it", () => {
    const adopted = adoptLegacy(emptyRegistry(), NOW);
    const slot = adopted.slots[0];

    // Pointing at the old key is what keeps one set of answers from becoming
    // two: a copy would leave the original to be discovered again later.
    expect(slot?.storage_key).toBe(LEGACY_STORAGE_KEY);
    expect(adopted.active_id).toBe(slot?.id);

    // Running twice must not produce a second copy of the same box.
    expect(adoptLegacy(adopted, LATER).slots).toHaveLength(1);
  });

  it("accepts a name in any script and refuses what names nobody", () => {
    expect(isUsableName("Ербол")).toBe(true);
    expect(isUsableName("Aigerim")).toBe(true);
    expect(isUsableName("  ")).toBe(false);
    expect(isUsableName("--")).toBe(false);
  });

  it("survives a registry a browser extension chewed on", () => {
    expect(parseRegistry("не объект").slots).toEqual([]);
    expect(parseRegistry({ version: 99, active_id: null, slots: [] }).slots).toEqual([]);

    // An active id with no slot behind it would show a name with no data.
    const dangling: ProfileRegistry = { version: 1, active_id: "gone", slots: [] };
    expect(parseRegistry(dangling).active_id).toBeNull();
  });

  it("finds nobody in an empty registry", () => {
    expect(findByName(emptyRegistry(), "Ербол", "")).toBeUndefined();
  });
});

describe("switching profiles", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetBootForTests();
    useProfileStore.setState({ registry: emptyRegistry(), ready: false });
    useAppStore.setState({ ...createDefaultAppData(), hasHydrated: true });
    useAppStore.persist.setOptions({ name: LEGACY_STORAGE_KEY });
  });

  /** A profile distinguishable from the demo at a glance. */
  function mine(): Profile {
    return { ...DEMO_PROFILE, interests: ["моё-дело"], countries: ["KZ"] };
  }

  it("does not lose your answers when you look at the demo", () => {
    const store = useProfileStore.getState();

    store.signInAs("Ербол", "Ниязбек", NOW);
    useAppStore.getState().setProfile(mine());
    useAppStore.getState().markActionComplete("apply_form");

    // The bug, exactly: open the demo, then come back.
    store.openDemo(DEMO_PROFILE, NOW);
    expect(useAppStore.getState().profile?.interests).toEqual(DEMO_PROFILE.interests);
    expect(useAppStore.getState().completed_action_ids).toEqual([]);

    const me = personalSlots(useProfileStore.getState().registry)[0];
    useProfileStore.getState().switchTo(me?.id ?? "", LATER);

    expect(useAppStore.getState().profile?.interests).toEqual(["моё-дело"]);
    expect(useAppStore.getState().completed_action_ids).toEqual(["apply_form"]);
  });

  it("keeps two people apart", () => {
    const store = useProfileStore.getState();

    store.signInAs("Ербол", "", NOW);
    useAppStore.getState().setProfile({ ...mine(), interests: ["первый"] });

    store.signInAs("Айгерим", "", LATER);
    // A fresh profile starts empty — it must not inherit the previous one.
    expect(useAppStore.getState().profile).toBeNull();
    useAppStore.getState().setProfile({ ...mine(), interests: ["вторая"] });

    const [newest, oldest] = personalSlots(useProfileStore.getState().registry);
    expect(newest?.first_name).toBe("Айгерим");

    useProfileStore.getState().switchTo(oldest?.id ?? "", LATER);
    expect(useAppStore.getState().profile?.interests).toEqual(["первый"]);
  });

  it("leaves the answers alone when somebody steps out", () => {
    const store = useProfileStore.getState();
    store.signInAs("Ербол", "", NOW);
    useAppStore.getState().setProfile(mine());

    store.leave();
    expect(useAppStore.getState().profile).toBeNull();
    expect(useProfileStore.getState().registry.active_id).toBeNull();

    const me = personalSlots(useProfileStore.getState().registry)[0];
    useProfileStore.getState().switchTo(me?.id ?? "", LATER);
    expect(useAppStore.getState().profile?.interests).toEqual(["моё-дело"]);
  });

  it("takes the data with the profile when one is forgotten", () => {
    const store = useProfileStore.getState();
    store.signInAs("Ербол", "", NOW);
    useAppStore.getState().setProfile(mine());

    const me = personalSlots(useProfileStore.getState().registry)[0];
    const key = me?.storage_key ?? "";
    expect(window.localStorage.getItem(key)).not.toBeNull();

    useProfileStore.getState().forget(me?.id ?? "");

    // Dropping the name and leaving the answers on the machine would be the
    // worst of both: gone from view, still stored.
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(personalSlots(useProfileStore.getState().registry)).toHaveLength(0);
    expect(useAppStore.getState().profile).toBeNull();
  });

  it("never writes an empty profile over a full one", () => {
    const store = useProfileStore.getState();
    store.signInAs("Ербол", "", NOW);
    useAppStore.getState().setProfile(mine());

    const me = personalSlots(useProfileStore.getState().registry)[0];
    const saved = JSON.parse(window.localStorage.getItem(me?.storage_key ?? "") ?? "{}");

    // Activating the same slot again must be a no-op, not a reset. Reading the
    // box before repointing the store is the only thing that makes it so.
    // Compared as data, not as bytes: a rewrite may reorder keys, and only the
    // answers matter.
    activateSlot(me!);
    const after = JSON.parse(window.localStorage.getItem(me?.storage_key ?? "") ?? "{}");
    expect(after.state.profile).toEqual(saved.state.profile);
    expect(after.state.completed_action_ids).toEqual(saved.state.completed_action_ids);
    expect(useAppStore.getState().profile?.interests).toEqual(["моё-дело"]);
  });
});
