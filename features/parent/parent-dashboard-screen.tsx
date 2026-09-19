"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/use-auth-session";
import type { ParentCareerSignal } from "@/lib/career/parent-signal";
import type { CareerState } from "@/lib/career/types";
import { migrateAppState, type ActionState } from "@/lib/state/app-store";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ParentDashboard } from "./parent-dashboard";

interface Child {
  id: string;
  name: string;
  email: string;
}

/**
 * Loads the parent's linked children and the selected one's `student_state`,
 * then hands a plain `Profile` + progress to `ParentDashboard` to render.
 *
 * The account switcher is real even though today's demo will likely only
 * show one child — a parent with two kids on Stepwise should not need a
 * second login to see the second one.
 */
export function ParentDashboardScreen() {
  const router = useRouter();
  const { status, user } = useAuthSession();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [childState, setChildState] = useState<
    | { status: "loading" }
    | { status: "empty" }
    | {
        status: "ready";
        profile: Profile;
        completedActionIds: string[];
        actionStates: Record<string, ActionState>;
        career: CareerState;
        parentSignal: ParentCareerSignal | null;
      }
  >({ status: "loading" });

  useEffect(() => {
    if (status !== "parent" || user === null) return;
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const { data: links } = await supabase
        .from("parent_child_links")
        .select("student_user_id")
        .eq("parent_user_id", user.id);

      const studentIds = (links ?? []).map((link) => link.student_user_id);
      if (studentIds.length === 0) {
        if (!cancelled) setChildren([]);
        return;
      }

      const { data: rows } = await supabase.from("users").select("id, name, email").in("id", studentIds);
      if (cancelled) return;
      const list = (rows ?? []).map((row) => ({ id: row.id, name: row.name, email: row.email }));
      setChildren(list);
      setSelectedId((current) => current ?? list[0]?.id ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, user]);

  useEffect(() => {
    if (selectedId === null || user === null) return;
    let cancelled = false;

    void (async () => {
      setChildState({ status: "loading" });
      const supabase = createClient();
      const [{ data: row }, { data: signalRow }] = await Promise.all([
        supabase
          .from("student_state")
          .select("schema_version, state, updated_at")
          .eq("student_user_id", selectedId)
          .maybeSingle(),
        supabase
          .from("parent_career_signal")
          .select("parent_direction, parent_priorities, parent_support")
          .eq("student_user_id", selectedId)
          .eq("parent_user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      const parentSignal: ParentCareerSignal | null =
        signalRow === null
          ? null
          : {
              parent_direction: signalRow.parent_direction ?? undefined,
              parent_priorities: signalRow.parent_priorities ?? undefined,
              parent_support: signalRow.parent_support ?? undefined,
            };

      if (row === null) {
        setChildState({ status: "empty" });
        return;
      }
      const data = migrateAppState(row.state, row.schema_version);
      if (data.profile === null) {
        setChildState({ status: "empty" });
        return;
      }
      setChildState({
        status: "ready",
        profile: data.profile,
        completedActionIds: data.completed_action_ids,
        actionStates: data.action_states,
        career: data.career,
        parentSignal,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, user]);

  if (status !== "parent") return null;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/start");
  }

  const signOutButton = (
    <Button variant="ghost" size="sm" className="min-h-9 text-muted-foreground" onClick={() => void signOut()}>
      <SignOutIcon className="size-4" aria-hidden />
      Выйти
    </Button>
  );

  if (children === null) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <>
        <div className="mb-6 flex justify-end">{signOutButton}</div>
        <div className="panel px-5 py-10 text-center">
          <h1 className="display text-xl font-semibold">Пока никто не привязан</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Как только ребёнок пришлёт тебе ссылку-приглашение и ты пройдёшь по ней, его план появится
            здесь.
          </p>
        </div>
      </>
    );
  }

  // `children.length === 0` returned above, so the fallback is always defined.
  const selected = children.find((child) => child.id === selectedId) ?? children[0]!;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        {children.length > 1 ? (
          <ChildSwitcher kids={children} selectedId={selected.id} onSelect={setSelectedId} />
        ) : (
          <span />
        )}
        {signOutButton}
      </div>

      {childState.status === "loading" ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : childState.status === "empty" ? (
        <div className="panel px-5 py-10 text-center">
          <h1 className="display text-xl font-semibold">{selected.name || selected.email} ещё не начал(а) интервью</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            План появится здесь, как только он или она ответит на первые вопросы в приложении.
          </p>
        </div>
      ) : (
        // Keyed by child: a stale note-form draft or list from the previous
        // child must not survive a switch, and remounting is the simplest
        // way to guarantee that.
        <ParentDashboard
          key={selected.id}
          studentId={selected.id}
          studentName={selected.name}
          profile={childState.profile}
          completedActionIds={childState.completedActionIds}
          actionStates={childState.actionStates}
          career={childState.career}
          parentSignal={childState.parentSignal}
        />
      )}
    </>
  );
}

function ChildSwitcher({
  kids,
  selectedId,
  onSelect,
}: {
  kids: Child[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Выбор ребёнка">
      {kids.map((child) => (
        <button
          key={child.id}
          type="button"
          role="tab"
          aria-selected={child.id === selectedId}
          onClick={() => onSelect(child.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            child.id === selectedId
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-muted-foreground hover:border-border-strong",
          )}
        >
          {child.name || child.email}
        </button>
      ))}
    </div>
  );
}
