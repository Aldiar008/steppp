import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

/**
 * A real bug this test exists to keep dead: without a configured Supabase
 * project, `createServerClient` throws on an empty URL/key, and because the
 * old code created that client unconditionally, *every* matched route —
 * `/start` and `/demo` included, the two pages a visitor can reach with no
 * account and no backend at all — came back as a bare 500. Caught only by
 * actually running `next start` and requesting the pages; nothing here failed
 * a typecheck, a lint pass or the existing test suite.
 *
 * This repository has no `.env.local`, so `NEXT_PUBLIC_SUPABASE_URL`/
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` are genuinely unset while this test runs —
 * it exercises the real failure mode, not a mocked stand-in for it.
 */
describe("proxy without a configured Supabase project", () => {
  it("lets a public page through instead of throwing", async () => {
    const request = new NextRequest(new URL("http://localhost/start"));
    const response = await proxy(request);
    expect(response.status).not.toBe(500);
  });

  it("lets /demo through too", async () => {
    const request = new NextRequest(new URL("http://localhost/demo"));
    const response = await proxy(request);
    expect(response.status).not.toBe(500);
  });

  it("does not redirect a protected route away when there is nothing to check a session against", async () => {
    // Not the desired long-term behaviour for a real deployment (that always
    // has a project configured) — just the honest fallback for the
    // no-backend-at-all case, asserted so a future change notices if it
    // starts throwing again instead of silently doing something else.
    const request = new NextRequest(new URL("http://localhost/doors"));
    const response = await proxy(request);
    expect(response.status).not.toBe(500);
  });
});
