import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

/**
 * A fake Supabase client, global to every test.
 *
 * `createBrowserClient` throws synchronously without real project
 * credentials, which this test run never has — and several screens
 * (`NotesFromParent`, `useAuthSession`, the parent dashboard) call
 * `createClient()` from an effect now, not just from account-only pages.
 * Without this, mounting any of them here turns into an unhandled promise
 * rejection instead of a clean "no rows yet". Every query resolves to an
 * empty, error-free result — exactly what a signed-out visitor with no
 * Supabase project sees in the app itself.
 */
vi.mock("@/lib/supabase/client", () => {
  const chain: () => Record<string, unknown> = () => ({
    select: chain,
    eq: chain,
    in: chain,
    order: chain,
    is: chain,
    insert: chain,
    update: chain,
    upsert: chain,
    delete: chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [], error: null }),
  });

  const client = {
    from: chain,
    rpc: () => Promise.resolve({ data: null, error: null }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
      signUp: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
    },
  };

  return { createClient: () => client };
});

// jsdom ships neither of these; Radix primitives and our layout hooks need them.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
