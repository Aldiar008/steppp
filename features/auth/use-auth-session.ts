"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/state/auth-store";
import { isDemoCookieSet } from "@/lib/state/demo-mode";

/**
 * Reads the Supabase session once and keeps `useAuthStore` current after that.
 *
 * Mirrors the boot pattern the old `useProfileSession` used: a lazy
 * `useState` initialiser runs before first paint (an effect would flash the
 * signed-out screen for a frame), a `useEffect` covers the case where the
 * store was touched before this component mounted, and a module-level guard
 * makes both safe to call from every screen that needs auth state without
 * opening a second subscription.
 */
let subscribed = false;

async function refresh(): Promise<void> {
  const store = useAuthStore.getState();

  // A demo session never touches Supabase — checked before anything else so
  // it also works with no project configured, or the network down.
  if (isDemoCookieSet()) {
    if (store.status !== "demo") store.setDemo();
    return;
  }

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user === null) {
      store.setSignedOut();
      return;
    }

    const { data: row } = await supabase
      .from("users")
      .select("role, name, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (row?.role === "parent") {
      store.setParent({ id: user.id, email: user.email ?? "", name: row.name, onboardingCompleted: false });
      return;
    }
    if (row?.role === "student") {
      store.setStudent({
        id: user.id,
        email: user.email ?? "",
        name: row.name,
        onboardingCompleted: row.onboarding_completed,
      });
      return;
    }
    // role is still null — the trigger that copies auth.users into public.users
    // hasn't committed yet. Left as "loading" rather than "signed-out": the
    // next onAuthStateChange or a manual retry picks it up once it does.
  } catch {
    // The client constructor throws synchronously on a misconfigured project
    // (missing/blank NEXT_PUBLIC_SUPABASE_URL/ANON_KEY), and a network failure
    // can reject either call above. Every screen that reads `useAuthSession()`
    // — the whole app shell, via app-nav.tsx — needs *a* status to render;
    // "signed-out" is the one state every recovery path (the sign-in link)
    // stays reachable from, instead of leaving the store on "loading" forever.
    store.setSignedOut();
  }
}

function boot(): void {
  // Guards the lazy `useState` initialiser below, which runs during SSR/static
  // generation too — a Supabase client cannot be constructed there (no env at
  // build time for a project that doesn't exist yet), and there is no session
  // to read on the server anyway. The `useEffect` re-check covers the real
  // client mount.
  if (typeof window === "undefined") return;
  if (subscribed) return;
  subscribed = true;
  void refresh();
  try {
    // Unguarded, this ran during useState's lazy initializer — i.e. during
    // render — so a misconfigured project didn't just fail this subscription,
    // it threw out of the render of every screen that mounts app-nav.tsx.
    // refresh() above already resolves the store to signed-out in that case;
    // this call just has no live subscription to keep it current afterward.
    createClient().auth.onAuthStateChange(() => {
      void refresh();
    });
  } catch {
    // See the catch in refresh().
  }
}

export function useAuthSession() {
  useState(() => boot());
  useEffect(() => {
    boot();
  }, []);

  // `useShallow` matters here, not just style: a selector returning a fresh
  // object literal on every call never equals its previous result by
  // reference, and `useSyncExternalStore` (what Zustand's hook is built on)
  // reacts to that by re-rendering to fetch a snapshot again — which builds
  // another fresh object, forever. That is React error #185, "Maximum update
  // depth exceeded", and it only ever showed up in a real browser: every
  // jsdom/RTL test in this repo renders once and never runs the render loop
  // long enough to trip React's guard against it.
  return useAuthStore(useShallow((state) => ({ status: state.status, user: state.user })));
}

/** Test seam: lets a test boot a fresh session without reloading the module. */
export function resetAuthBootForTests(): void {
  subscribed = false;
}
