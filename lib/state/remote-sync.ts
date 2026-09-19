"use client";

/**
 * Keeps `useAppStore` and `student_state` pointed at each other for a signed-in
 * student.
 *
 *     boot          read the account's own local box, read the DB row,
 *                   decide which is newer, load the winner into the store
 *     every change  debounced upsert back into `student_state`
 *     onboarding    the moment `interview.completed` flips, tell the DB too
 *
 * `localStorage` is not retired — it is still what `useAppStore`'s `persist`
 * middleware writes on every change, exactly as before accounts existed. What
 * changes is *which key*: each student gets their own
 * (`stepwise-storage:<id>`), the same trick `lib/state/profile-session.ts`
 * used to use for named local boxes, now keyed by a real account instead of a
 * typed name. That is what stops one browser signing out of one student and
 * into another from leaking the first student's board into the second's.
 *
 * The one bare `stepwise-storage` key — where every build before accounts
 * existed wrote — is read exactly once, by whichever account signs in first
 * on this browser, as the migration path the product owes existing users. It
 * is deleted once its answers have been adopted, so a second account signing
 * in later on the same machine cannot also claim it.
 */
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/state/auth-store";
import {
  APP_SCHEMA_VERSION,
  createDefaultAppData,
  migrateAppState,
  partializeAppData,
  useAppStore,
  type AppData,
} from "@/lib/state/app-store";

const LEGACY_KEY = "stepwise-storage";

function accountKey(studentId: string): string {
  return `${LEGACY_KEY}:${studentId}`;
}

function readLocalBox(key: string): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as { state?: unknown; version?: number };
    return migrateAppState(parsed.state, parsed.version ?? 0);
  } catch {
    return null;
  }
}

/** Did somebody actually answer anything, or is this just the store's defaults? */
function holdsAnswers(box: AppData | null): boolean {
  if (box === null) return false;
  return box.profile !== null || box.interview.started || box.completed_action_ids.length > 0;
}

export interface RemoteRow {
  schemaVersion: number;
  state: unknown;
  updatedAt: string;
}

/**
 * Which side wins, kept pure and separate from the network calls around it so
 * the decision itself is testable without a Supabase client.
 *
 * Ties and "only one side has anything" are not close calls: an empty side
 * never overwrites a side with real answers, and between two sides that both
 * have answers, the more recently computed board wins — `last_calculated_at`
 * is the applicant's own clock (set by `setRoute`), `updatedAt` is the row's.
 */
export function resolveStudentState(
  local: AppData,
  hasLocalAnswers: boolean,
  remote: RemoteRow | null,
): { data: AppData; pushToRemote: boolean } {
  if (remote === null) {
    return { data: local, pushToRemote: hasLocalAnswers };
  }

  const remoteData = migrateAppState(remote.state, remote.schemaVersion);
  if (!hasLocalAnswers) {
    return { data: remoteData, pushToRemote: false };
  }

  const localTime = local.metadata.last_calculated_at;
  if (localTime !== undefined && localTime > remote.updatedAt) {
    return { data: local, pushToRemote: true };
  }
  return { data: remoteData, pushToRemote: false };
}

/* -------------------------------------------------------------------------- */
/* The imperative shell — not unit tested; see README's manual checklist.     */
/* -------------------------------------------------------------------------- */

let bootedFor: string | null = null;
let teardownFns: (() => void)[] = [];
let warnedOffline = false;

async function pushState(studentId: string, data: AppData): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("student_state").upsert({
    student_user_id: studentId,
    schema_version: APP_SCHEMA_VERSION,
    state: partializeAppData(data),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (!warnedOffline) {
      warnedOffline = true;
      toast.error("Изменения сохранены только в этом браузере — войди снова, чтобы синхронизировать");
    }
    return;
  }
  warnedOffline = false;
}

async function completeOnboarding(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_onboarding_complete");
  if (error) return;

  const current = useAuthStore.getState().user;
  if (current !== null) useAuthStore.getState().setStudent({ ...current, onboardingCompleted: true });
}

function subscribeToChanges(studentId: string): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let wasCompleted = useAppStore.getState().interview.completed;

  const unsubscribe = useAppStore.subscribe((state) => {
    if (state.interview.completed && !wasCompleted) {
      wasCompleted = true;
      void completeOnboarding();
    }

    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void pushState(studentId, useAppStore.getState());
    }, 1000);
  });

  const flushOnHide = () => {
    if (document.visibilityState === "hidden") void pushState(studentId, useAppStore.getState());
  };
  document.addEventListener("visibilitychange", flushOnHide);

  teardownFns.push(() => {
    unsubscribe();
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    document.removeEventListener("visibilitychange", flushOnHide);
  });
}

/**
 * Call once a student's identity is known. Safe to call again with the same
 * id (a no-op) or with a different one (tears the previous session down
 * first) — the boot component below relies on both.
 */
export async function bootRemoteSync(studentId: string): Promise<void> {
  if (bootedFor === studentId) return;
  teardown();
  bootedFor = studentId;

  const ownKey = accountKey(studentId);
  const ownBox = readLocalBox(ownKey);
  const legacyBox = ownBox === null ? readLocalBox(LEGACY_KEY) : null;
  const localBox = ownBox ?? legacyBox ?? createDefaultAppData();
  const hasLocalAnswers = holdsAnswers(ownBox) || holdsAnswers(legacyBox);

  // Repointed before any `setState` below, so the merged result — and every
  // write after it — lands under this account's own key, never the shared
  // legacy one.
  useAppStore.persist.setOptions({ name: ownKey });

  const supabase = createClient();
  const { data: row } = await supabase
    .from("student_state")
    .select("schema_version, state, updated_at")
    .eq("student_user_id", studentId)
    .maybeSingle();

  const remote: RemoteRow | null =
    row === null
      ? null
      : { schemaVersion: row.schema_version, state: row.state, updatedAt: row.updated_at };

  const { data, pushToRemote } = resolveStudentState(localBox, hasLocalAnswers, remote);
  useAppStore.setState({ ...data, hasHydrated: true });

  if (pushToRemote) {
    await pushState(studentId, data);
    if (legacyBox !== null && ownBox === null) {
      // The legacy box's answers now live in this account; nothing else on
      // this browser should be able to adopt them a second time.
      window.localStorage.removeItem(LEGACY_KEY);
    }
  }

  subscribeToChanges(studentId);
}

function teardown(): void {
  for (const fn of teardownFns) fn();
  teardownFns = [];
}

/** Called on sign-out so the next visitor to this browser starts clean. */
export function stopRemoteSync(): void {
  teardown();
  bootedFor = null;
  warnedOffline = false;
  useAppStore.persist.setOptions({ name: LEGACY_KEY });
  useAppStore.setState({ ...createDefaultAppData(), hasHydrated: true });
}

/** Test seam. */
export function resetRemoteSyncForTests(): void {
  teardown();
  bootedFor = null;
  warnedOffline = false;
}
