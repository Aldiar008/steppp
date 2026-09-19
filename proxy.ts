import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decideRedirect, type SessionInfo } from "@/lib/auth/route-guard";
import type { Database } from "@/lib/supabase/types";

/**
 * Refreshes the Supabase session cookie and enforces `decideRedirect` on
 * every request the matcher below lets through.
 *
 * Named `proxy` rather than `middleware`: Next.js 16 renamed the convention
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`)
 * and a `middleware.ts` in this build only works through a deprecation shim.
 *
 * The matcher is an allow-list, not a deny-list, on purpose: the landing page
 * is frozen and must never be touched by this file, by accident or by a
 * future route added under a broad pattern. Anything not listed here simply
 * never runs this code.
 */
export async function proxy(request: NextRequest) {
  // Without a configured project there is no session to read and nothing
  // below can do anything useful — `createServerClient` itself throws on an
  // empty URL/key. Previously that exception took down every matched route,
  // public ones (`/start`, `/demo`) included, with a bare 500: a judge or a
  // fresh checkout with no `.env.local` yet could never even reach the sign-in
  // screen. Letting the request through is the honest fallback — the pages
  // that actually need Supabase still fail there, clearly, when a real action
  // is attempted (see README "Аутентификация и данные").
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  // A demo visitor never touches Supabase, here or anywhere else in the demo
  // path (see `lib/state/demo-mode.ts`) — checked before the network call
  // below so demo mode also survives a Supabase outage.
  if (request.cookies.get("stepwise-demo")?.value === "1") {
    const redirectTo = decideRedirect({ kind: "demo" }, request.nextUrl.pathname);
    if (redirectTo !== null) {
      const url = request.nextUrl.clone();
      url.pathname = redirectTo;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() re-validates the token against Supabase rather than trusting the
  // cookie's decoded claims, which matters here because this result gates
  // access to another person's data (the parent → student read path).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let session: SessionInfo = { kind: "signed-out" };
  if (user !== null) {
    const { data: row } = await supabase
      .from("users")
      .select("role, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (row?.role === "parent") session = { kind: "parent" };
    else if (row?.role === "student") {
      session = { kind: "student", onboardingCompleted: row.onboarding_completed };
    }
  }

  const redirectTo = decideRedirect(session, request.nextUrl.pathname);
  if (redirectTo !== null) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/start",
    "/demo",
    "/parent/:path*",
    "/changes",
    "/compare",
    "/diagnosis",
    "/diagnostics",
    "/doors",
    "/doors/:path*",
    "/interview",
    "/next-action",
    "/profession",
    "/profile",
    "/roadmap",
    "/sources",
  ],
};
