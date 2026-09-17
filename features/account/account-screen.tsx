"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckIcon,
  PlayCircleIcon,
  SignOutIcon,
  TrashIcon,
  UserPlusIcon,
} from "@phosphor-icons/react/dist/ssr";

import { DEMO_PROFILE } from "@/data/demo-profile";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form";
import { formatDateRu } from "@/lib/date";
import { useProfileStore } from "@/lib/state/profile-store";
import {
  activeSlot,
  displayName,
  findSlot,
  isUsableName,
  personalSlots,
  DEMO_SLOT_ID,
  type ProfileSlot,
} from "@/lib/state/profiles";
import { cn } from "@/lib/utils";
import { Avatar } from "./sign-in-screen";
import { nowIso, useProfileSession } from "./use-profile-session";

/**
 * Whose answers are open, and every way to change that.
 *
 * A screen rather than a dropdown, because on a phone a dropdown holding four
 * profiles, a rename field and a delete confirmation is a worse dropdown. It
 * also means the way back from the demo is a real place with an address, not a
 * menu somebody has to discover.
 */
export function AccountScreen() {
  const router = useRouter();
  const { ready } = useProfileSession();

  const registry = useProfileStore((state) => state.registry);
  const signInAs = useProfileStore((state) => state.signInAs);
  const switchTo = useProfileStore((state) => state.switchTo);
  const openDemo = useProfileStore((state) => state.openDemo);
  const renameSlot = useProfileStore((state) => state.renameSlot);
  const forget = useProfileStore((state) => state.forget);
  const leave = useProfileStore((state) => state.leave);

  const [adding, setAdding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [renamingId, setRenamingId] = useState<string | undefined>(undefined);
  const [confirmingId, setConfirmingId] = useState<string | undefined>(undefined);

  if (!ready) return null;

  const current = activeSlot(registry);
  const people = personalSlots(registry);
  const demo = findSlot(registry, DEMO_SLOT_ID);

  return (
    <>
      <PageHeader
        title="Кто сейчас в приложении"
        lede="Профили лежат в этом браузере, каждый в своей коробке. Переключение ничего не стирает."
        back={{ href: "/doors", label: "К путям" }}
      />

      <ul className="space-y-2">
        {people.map((slot) => (
          <li key={slot.id}>
            <SlotRow
              slot={slot}
              current={slot.id === current?.id}
              renaming={renamingId === slot.id}
              confirming={confirmingId === slot.id}
              onOpen={() => {
                switchTo(slot.id, nowIso());
                router.push("/doors");
              }}
              onRename={(first, last) => {
                renameSlot(slot.id, first, last, nowIso());
                setRenamingId(undefined);
              }}
              onStartRename={() => setRenamingId(slot.id)}
              onCancelRename={() => setRenamingId(undefined)}
              onAskForget={() => setConfirmingId(slot.id)}
              onCancelForget={() => setConfirmingId(undefined)}
              onForget={() => {
                forget(slot.id);
                setConfirmingId(undefined);
              }}
            />
          </li>
        ))}
      </ul>

      {adding ? (
        <form
          className="mt-3 space-y-3 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isUsableName(firstName)) return;
            signInAs(firstName, lastName, nowIso());
            setAdding(false);
            setFirstName("");
            setLastName("");
            router.push("/start");
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-first" className="mb-1.5 block text-sm font-medium">
                Имя
              </label>
              <input
                id="new-first"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={inputClass}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="new-last" className="mb-1.5 block text-sm font-medium">
                Фамилия
              </label>
              <input
                id="new-last"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={inputClass}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="min-h-10" disabled={!isUsableName(firstName)}>
              Создать и начать
            </Button>
            <Button type="button" variant="ghost" className="min-h-10" onClick={() => setAdding(false)}>
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="mt-3 min-h-10 w-full" onClick={() => setAdding(true)}>
          <UserPlusIcon className="size-4" aria-hidden />
          Добавить профиль
        </Button>
      )}

      <section className="mt-6 border-t border-border pt-4">
        <h2 className="text-sm font-medium">Демо</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Демо-профиль лежит отдельно от твоего и ничего в нём не меняет. Данные в нём —
          придуманного человека, а каталог вузов и все сроки настоящие.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={current?.id === DEMO_SLOT_ID ? "secondary" : "outline"}
            className="min-h-10"
            onClick={() => {
              openDemo(DEMO_PROFILE, nowIso());
              router.push("/doors");
            }}
          >
            <PlayCircleIcon className="size-4" aria-hidden />
            {current?.id === DEMO_SLOT_ID ? "Ты сейчас в демо" : "Открыть демо"}
          </Button>
          {demo !== undefined && current?.id !== DEMO_SLOT_ID && (
            <Button
              variant="ghost"
              className="min-h-10 text-muted-foreground"
              onClick={() => forget(DEMO_SLOT_ID)}
            >
              <TrashIcon className="size-4" aria-hidden />
              Стереть демо
            </Button>
          )}
        </div>
      </section>

      {current !== undefined && (
        <Button
          variant="ghost"
          className="mt-4 min-h-10 w-full text-muted-foreground"
          onClick={() => {
            leave();
            router.push("/start");
          }}
        >
          <SignOutIcon className="size-4" aria-hidden />
          Выйти — ответы останутся на месте
        </Button>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Пароля нет и сервера нет: всё лежит в этом браузере, и на другом устройстве профиля не
        будет. Если очистить данные сайта, профили исчезнут вместе с ними.{" "}
        <Link href="/sources" className="underline underline-offset-2">
          Источники и методика
        </Link>
      </p>
    </>
  );
}

function SlotRow({
  slot,
  current,
  renaming,
  confirming,
  onOpen,
  onRename,
  onStartRename,
  onCancelRename,
  onAskForget,
  onCancelForget,
  onForget,
}: {
  slot: ProfileSlot;
  current: boolean;
  renaming: boolean;
  confirming: boolean;
  onOpen: () => void;
  onRename: (firstName: string, lastName: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onAskForget: () => void;
  onCancelForget: () => void;
  onForget: () => void;
}) {
  const [first, setFirst] = useState(slot.first_name);
  const [last, setLast] = useState(slot.last_name);

  return (
    <div className={cn("border-b border-border py-3", current && "lane lane-open pl-3")}>
      <div className="flex items-center gap-3">
        <Avatar slot={slot} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">
            {displayName(slot)}
            {current && <span className="ml-2 text-xs font-normal text-open">сейчас открыт</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            последний раз {formatDateRu(slot.updated_at.slice(0, 10))}
          </p>
        </div>
        {!current && (
          <Button size="sm" className="min-h-9" onClick={onOpen}>
            Открыть
          </Button>
        )}
      </div>

      {renaming ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            value={first}
            onChange={(event) => setFirst(event.target.value)}
            aria-label="Имя"
            className={cn(inputClass, "w-32 flex-1")}
          />
          <input
            value={last}
            onChange={(event) => setLast(event.target.value)}
            aria-label="Фамилия"
            className={cn(inputClass, "w-32 flex-1")}
          />
          <Button
            size="sm"
            className="min-h-9"
            disabled={!isUsableName(first)}
            onClick={() => onRename(first, last)}
          >
            <CheckIcon className="size-4" aria-hidden />
            Готово
          </Button>
          <Button size="sm" variant="ghost" className="min-h-9" onClick={onCancelRename}>
            Отмена
          </Button>
        </div>
      ) : confirming ? (
        // Deleting a profile deletes the answers behind it, so the sentence says
        // that rather than "вы уверены?".
        <div className="mt-3 rounded-lg border border-critical/30 bg-critical-soft p-3">
          <p className="text-sm leading-relaxed text-critical-ink">
            Вместе с профилем исчезнут ответы, отмеченные шаги и рассчитанная доска. Вернуть их
            будет нельзя.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="destructive" className="min-h-9" onClick={onForget}>
              Стереть насовсем
            </Button>
            <Button size="sm" variant="ghost" className="min-h-9" onClick={onCancelForget}>
              Оставить
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-1">
          <Button size="sm" variant="ghost" className="min-h-9 text-muted-foreground" onClick={onStartRename}>
            Переименовать
          </Button>
          <Button size="sm" variant="ghost" className="min-h-9 text-muted-foreground" onClick={onAskForget}>
            Стереть
          </Button>
        </div>
      )}
    </div>
  );
}
