"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * The one Supabase client client components use.
 *
 * `createBrowserClient` keeps the session in cookies rather than
 * `localStorage`, so the server (middleware, route handlers) and the browser
 * always agree about who is signed in — a plain `createClient` from
 * `@supabase/supabase-js` would split the session into two places that can
 * drift.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
