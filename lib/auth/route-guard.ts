/**
 * Where a request should be sent, as a pure function of who is signed in and
 * where they were headed.
 *
 * Kept apart from `middleware.ts` for the same reason `migrateAppState` is kept
 * apart from the persist config in `lib/state/app-store.ts`: a redirect
 * decision is real behaviour with real edge cases (a parent hitting a student
 * page, a student mid-onboarding hitting anything but the interview), and
 * something that only ever ran inside the Edge runtime would be untestable.
 */

export type SessionInfo =
  | { kind: "signed-out" }
  | { kind: "student"; onboardingCompleted: boolean }
  | { kind: "parent" }
  /** A demo visitor — see `lib/state/demo-mode.ts`. Never backed by Supabase. */
  | { kind: "demo" };

/**
 * Paths that render the student application and therefore require a signed-in
 * student. Mirrors the page files under `app/(app)/*` — a new page added there
 * needs its prefix added here too, and to the middleware matcher.
 */
const STUDENT_APP_PATHS = [
  "/changes",
  "/compare",
  "/diagnosis",
  "/diagnostics",
  "/doors",
  "/interview",
  "/next-action",
  "/profession",
  "/profile",
  "/roadmap",
  "/sources",
] as const;

function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isStudentAppPath(path: string): boolean {
  return STUDENT_APP_PATHS.some((prefix) => isUnder(path, prefix));
}

function isParentDashboardPath(path: string): boolean {
  return isUnder(path, "/parent/dashboard");
}

/**
 * `null` means: let the request through unchanged. Anything else is where to
 * send it instead — the caller still has to actually issue the redirect.
 */
export function decideRedirect(session: SessionInfo, path: string): string | null {
  if (isStudentAppPath(path)) {
    if (session.kind === "signed-out") return "/start";
    if (session.kind === "parent") return "/parent/dashboard";
    // A demo visitor is always "onboarded" — the whole point is to skip
    // straight to a fully populated account, never the interview.
    if (session.kind === "demo") return null;
    // A student who hasn't finished the interview is sent back to it from
    // anywhere else in the app, on every request — that is the whole of
    // "resume on next login", since the interview itself remembers where it
    // left off via the existing `answered_question_ids` list.
    if (!session.onboardingCompleted && path !== "/interview") return "/interview";
    return null;
  }

  if (isParentDashboardPath(path)) {
    if (session.kind === "signed-out") return "/start";
    if (session.kind === "student") {
      return session.onboardingCompleted ? "/doors" : "/interview";
    }
    // A demo visitor has no parent dashboard to see — send them back to the
    // one account they do have.
    if (session.kind === "demo") return "/doors";
    return null;
  }

  // Everything else — the landing, /start, /demo, /parent/join/*, /auth/* — is
  // public and untouched here.
  return null;
}
