"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutIcon, TrashIcon, UsersIcon } from "@phosphor-icons/react/dist/ssr";

import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/use-auth-session";
import { NotesFromParent } from "@/features/notes/notes-from-parent";
import { InviteParentDialog } from "@/features/parent/invite-parent-dialog";
import { createClient } from "@/lib/supabase/client";

interface LinkedParent {
  parentUserId: string;
  name: string;
  email: string;
}

/**
 * "Who can see this" — the direct replacement for the old profile-switcher
 * screen. There is nothing to switch between any more (one browser, one
 * signed-in account), so what earns a place here instead is the one thing
 * that genuinely needs a screen: who else has read access, and the invite
 * that grants it.
 */
export function AccountFamilyScreen() {
  const router = useRouter();
  const { status, user } = useAuthSession();

  const [parents, setParents] = useState<LinkedParent[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "student" || user === null) return;
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const { data: links } = await supabase
        .from("parent_child_links")
        .select("parent_user_id")
        .eq("student_user_id", user.id);

      const parentIds = (links ?? []).map((link) => link.parent_user_id);
      if (parentIds.length === 0) {
        if (!cancelled) setParents([]);
        return;
      }

      const { data: rows } = await supabase.from("users").select("id, name, email").in("id", parentIds);
      if (cancelled) return;
      setParents(
        (rows ?? []).map((row) => ({ parentUserId: row.id, name: row.name, email: row.email })),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [status, user]);

  async function revoke(parentUserId: string) {
    setRevoking(parentUserId);
    const supabase = createClient();
    await supabase.rpc("revoke_parent_link", { p_parent_id: parentUserId });
    setParents((current) => current?.filter((p) => p.parentUserId !== parentUserId) ?? current);
    setRevoking(null);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/start");
  }

  if (status !== "student" || user === null) return null;

  return (
    <>
      <PageHeader
        title="Аккаунт и семья"
        lede="Кто вошёл, и кто ещё видит твой план."
        back={{ href: "/doors", label: "К путям" }}
      />

      <section className="panel flex items-center gap-3 p-4">
        <Avatar name={user.name} email={user.email} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{user.name || user.email}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" className="min-h-9 text-muted-foreground" onClick={() => void signOut()}>
          <SignOutIcon className="size-4" aria-hidden />
          Выйти
        </Button>
      </section>

      <section className="mt-6 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <UsersIcon className="size-4 text-muted-foreground" aria-hidden />
            Родители с доступом
          </h2>
          <InviteParentDialog />
        </div>

        {parents === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Загружаем…</p>
        ) : parents.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Пока никто не подключён. Пригласи родителя — он увидит твой план для чтения, но не сможет
            ничего в нём изменить.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {parents.map((parent) => (
              <li
                key={parent.parentUserId}
                className="panel-inset flex items-center gap-3 p-3"
              >
                <Avatar name={parent.name} email={parent.email} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{parent.name || parent.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{parent.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-9 text-muted-foreground"
                  disabled={revoking === parent.parentUserId}
                  onClick={() => void revoke(parent.parentUserId)}
                >
                  <TrashIcon className="size-4" aria-hidden />
                  Отвязать
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 border-t border-border pt-4">
        <h2 className="text-sm font-medium">Заметки от родителей</h2>
        <NotesFromParent
          targetType="general"
          className="mt-3"
          emptyLabel="Пока ничего не оставили."
        />
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Родитель видит план только для чтения — ни один экран или запрос от его аккаунта не может
        изменить твой профиль или отметки о сделанном; это обеспечено на уровне базы данных, а не
        только скрытыми кнопками. Заметка выше — единственное, что он может тебе оставить, и тоже
        не может ничего изменить сама по себе.
      </p>
    </>
  );
}
