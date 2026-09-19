import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * The Supabase client for Server Components and Route Handlers.
 *
 * Writing cookies from a Server Component throws — Next only allows it from a
 * Server Action or Route Handler — so that call is wrapped rather than
 * guarded with a capability check. Middleware is what actually refreshes the
 * session on every request; this catch only stops a Server Component's read
 * of an expiring session from crashing the page.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* called from a Server Component; middleware handles the refresh */
          }
        },
      },
    },
  );
}
