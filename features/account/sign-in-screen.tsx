"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon, PlayCircleIcon, UserPlusIcon } from "@phosphor-icons/react/dist/ssr";

import { DEMO_PROFILE } from "@/data/demo-profile";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form";
import { formatDateRu } from "@/lib/date";
import { useAppStore } from "@/lib/state/app-store";
import { useProfileStore } from "@/lib/state/profile-store";
import {
  displayName,
  initials,
  isUsableName,
  personalSlots,
  type ProfileSlot,
} from "@/lib/state/profiles";
import { cn } from "@/lib/utils";
import { nowIso } from "./use-profile-session";

/**
 * Choosing whose answers to open.
 *
 * The honest framing matters more than the form. This is not a login: there is
 * no password to get wrong and no server to check it against, because the
 * product stores a teenager's answers about money and grades in their own
 * browser and has not earned anything more. A name is a label on a box, and the
 * screen says so out loud rather than implying a security it does not have.
 *
 * What it does fix is real. Looking at the demo used to overwrite the only
 * profile there was, with no way back. Now the demo stands beside your profile
 * instead of on top of it, and returning is one tap on your own name.
 */
export function SignInScreen({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  // Selected as the whole registry, then narrowed here. A selector that built
  // a new array would hand zustand a different value on every render and spin
  // the component forever.
  const registry = useProfileStore((state) => state.registry);
  const signInAs = useProfileStore((state) => state.signInAs);
  const openDemo = useProfileStore((state) => state.openDemo);
  const switchTo = useProfileStore((state) => state.switchTo);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const returning = personalSlots(registry);
  const showForm = adding || returning.length === 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isUsableName(firstName)) {
      setError("Напиши имя — по нему мы найдём твои ответы в следующий раз.");
      return;
    }
    signInAs(firstName, lastName, nowIso());
    continueFromHere();
  }

  /**
   * Where a profile lands you.
   *
   * Somebody who already answered the questions wants their board, not the
   * interview again — the whole point of coming back is that the work is done.
   * The store has just been pointed at their box, so this is simply asking
   * whether there is anything in it.
   */
  function continueFromHere() {
    if (useAppStore.getState().profile !== null) router.push("/doors");
    else onDone();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 py-8">
      <header className="text-center">
        <Wordmark className="justify-center" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {returning.length > 0 ? "С возвращением" : "Давай познакомимся"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {returning.length > 0
            ? "Выбери себя — ответы, сроки и отмеченные шаги откроются там, где ты их оставил."
            : "Имя нужно, чтобы вернуться к своим ответам, а не начинать заново."}
        </p>
      </header>

      {returning.length > 0 && (
        <ul className="space-y-2">
          {returning.map((slot) => (
            <li key={slot.id}>
              <ProfileButton
                slot={slot}
                onClick={() => {
                  switchTo(slot.id, nowIso());
                  continueFromHere();
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form onSubmit={submit} className="panel space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="first-name" className="mb-1.5 block text-sm font-medium">
                Имя
              </label>
              <input
                id="first-name"
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  setError(undefined);
                }}
                autoComplete="given-name"
                aria-invalid={error !== undefined}
                aria-describedby={error === undefined ? undefined : "name-error"}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="last-name" className="mb-1.5 block text-sm font-medium">
                Фамилия{" "}
                <span className="font-normal text-muted-foreground">— если хочешь</span>
              </label>
              <input
                id="last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                className={inputClass}
              />
            </div>
          </div>

          {error !== undefined && (
            <p id="name-error" role="alert" className="text-xs font-medium text-critical-ink">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="min-h-11 w-full">
            {returning.length > 0 ? "Создать профиль" : "Продолжить"}
            <ArrowRightIcon className="size-4" aria-hidden />
          </Button>
        </form>
      ) : (
        <Button
          variant="outline"
          size="lg"
          className="min-h-11 w-full"
          onClick={() => setAdding(true)}
        >
          <UserPlusIcon className="size-4" aria-hidden />
          Это другой человек
        </Button>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden />
        или
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div className="panel panel-inset space-y-2 p-4">
        <Button
          variant="ghost"
          className="min-h-11 w-full justify-start"
          onClick={() => {
            openDemo(DEMO_PROFILE, nowIso());
            router.push("/doors");
          }}
        >
          <PlayCircleIcon className="size-5 text-open" weight="duotone" aria-hidden />
          Посмотреть на демо-профиле
        </Button>
        {/* The sentence that used to be untrue. */}
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          Демо лежит отдельно и ничего твоего не трогает. Вернуться к себе можно в любой момент —
          через переключатель профиля слева.
        </p>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Это не аккаунт: пароля нет, и на другом устройстве профиля не будет. Имя — просто ярлык на
        коробке с ответами, которая лежит в этом браузере.
      </p>
    </div>
  );
}

function ProfileButton({ slot, onClick }: { slot: ProfileSlot; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "panel group flex w-full items-center gap-3 p-3 text-left transition-colors",
        "hover:border-border-strong",
      )}
    >
      <Avatar slot={slot} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{displayName(slot)}</span>
        <span className="block text-xs text-muted-foreground">
          был здесь {formatDateRu(slot.updated_at.slice(0, 10))}
        </span>
      </span>
      <ArrowRightIcon
        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

/**
 * Initials in a lit disc.
 *
 * The hue comes from the name itself — the same person is the same colour every
 * time, on every device, without storing anything. Deterministic, so a test can
 * assert it and a screenshot cannot drift.
 */
export function Avatar({ slot, size = 40 }: { slot: ProfileSlot; size?: number }) {
  const hue = hueOf(slot.id + slot.first_name);

  return (
    <span
      aria-hidden
      className="avatar grid shrink-0 place-items-center rounded-full border font-semibold"
      style={
        {
          width: size,
          height: size,
          fontSize: size * 0.36,
          "--avatar-hue": hue,
        } as React.CSSProperties
      }
    >
      {initials(slot)}
    </span>
  );
}

function hueOf(seed: string): number {
  let total = 0;
  for (let index = 0; index < seed.length; index += 1) total += seed.charCodeAt(index) * (index + 1);
  return total % 360;
}
