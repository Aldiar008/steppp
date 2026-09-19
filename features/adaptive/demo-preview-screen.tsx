"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { PlayCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { CATALOG } from "@/data/catalog";
import { DEMO_PROFILE } from "@/data/demo-profile";
import { Button } from "@/components/ui/button";
import { plural } from "@/features/route/ui";
import { todayIso } from "@/lib/date";
import { computeRoute } from "@/lib/engine";
import { enterDemoMode } from "@/lib/state/demo-mode";

/**
 * Screen 1 of "Путь пользователя: Амир из Шымкента" — the landing hook,
 * computed for real from Amir's real profile against the real catalogue
 * (`computeRoute`), not hand-typed. Pressing "Начать демо" hands the visitor
 * the entire product, fully populated and fully interactive, with no
 * signup — see `lib/state/demo-mode.ts` for how that stays isolated from
 * every real account.
 */
export function DemoPreviewScreen() {
  const today = useMemo(() => todayIso(), []);
  const route = useMemo(() => computeRoute(DEMO_PROFILE, CATALOG, today), [today]);
  const router = useRouter();

  const soonest = [...route.doors]
    .filter((door) => door.status === "closing_soon" || door.status === "open")
    .filter((door) => door.days_remaining !== undefined)
    .sort((a, b) => (a.days_remaining ?? Infinity) - (b.days_remaining ?? Infinity))[0];

  const start = () => {
    enterDemoMode();
    router.push("/doors");
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center">
      <div className="panel-inset mb-6 flex items-center gap-2 self-start px-4 py-2 text-xs text-muted-foreground">
        <PlayCircleIcon className="size-4 shrink-0" weight="duotone" aria-hidden />
        Демо: настоящий каталог и настоящие сроки, посчитанные для придуманного профиля — Амира из Шымкента.
      </div>

      <h1 className="display text-balance text-3xl font-semibold leading-tight sm:text-4xl">
        У тебя открыто {route.summary.open}{" "}
        {plural(route.summary.open, "путь", "пути", "путей")} поступления.
        {soonest !== undefined && soonest.days_remaining !== undefined && (
          <>
            {" "}
            Ближайший закроется через {soonest.days_remaining}{" "}
            {plural(soonest.days_remaining, "день", "дня", "дней")}.
          </>
        )}
      </h1>

      <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
        Stepwise считает, какие варианты у тебя ещё есть, когда каждый из них исчезнет и что сделать сегодня.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Мы не предсказываем шансы поступления. Мы показываем сроки и источники.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="w-full sm:w-auto" onClick={start}>
          Пройти демо за Амира
        </Button>
        <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
          <a href="/start">Зарегистрироваться и построить свой</a>
        </Button>
      </div>
    </div>
  );
}
