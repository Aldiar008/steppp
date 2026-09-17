"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowsLeftRightIcon,
  CaretUpDownIcon,
  DoorOpenIcon,
  MoonIcon,
  PathIcon,
  StethoscopeIcon,
  SunIcon,
  TargetIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useTheme } from "next-themes";
import type { Icon } from "@phosphor-icons/react";

import { Wordmark } from "@/components/brand";
import { Avatar } from "@/features/account/sign-in-screen";
import { useProfileSession } from "@/features/account/use-profile-session";
import { useProgress } from "@/features/route/use-progress";
import { useRouteView, type RouteView } from "@/features/route/use-route";
import { useAppStore } from "@/lib/state/app-store";
import { displayName } from "@/lib/state/profiles";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

/**
 * Five destinations, so the whole product fits a phone bottom bar without a
 * "more" drawer. The prototype had ten nav items and hid half of them from
 * mobile entirely, which made the AI screens unreachable on a phone.
 */
const NAV: readonly NavItem[] = [
  { href: "/doors", label: "Пути", icon: DoorOpenIcon },
  { href: "/next-action", label: "Шаг", icon: TargetIcon },
  { href: "/roadmap", label: "План", icon: PathIcon },
  { href: "/compare", label: "Сравнить", icon: ArrowsLeftRightIcon },
  { href: "/diagnostics", label: "Разбор", icon: StethoscopeIcon },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The counter beside a nav item.
 *
 * Only ever a number the engine produced. A badge that invented its own count
 * would be the one place in the product where the navigation and the screen it
 * leads to could disagree.
 */
function navCounts(view: RouteView): Readonly<Record<string, number>> {
  const summary = view.route?.summary;
  if (!view.ready || summary === undefined) return {};
  return {
    "/doors": summary.open + summary.closing_soon,
    "/compare": view.compareIds.length,
  };
}

export function DesktopNav() {
  const pathname = usePathname();
  const changePending = useAppStore((s) => s.previous_route !== null && !s.change_seen);
  const hydrated = useHydrated();
  // Computed once here and handed down: the badge and the progress bar are two
  // readings of the same board, and two independent runs would be waste.
  const view = useRouteView();
  const counts = navCounts(view);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl md:flex">
      <Link
        href="/doors"
        className="flex items-center px-5 py-5 transition-opacity hover:opacity-80"
      >
        <Wordmark />
      </Link>

      <div className="px-3 pb-3">
        <ProfileCard />
      </div>

      <nav aria-label="Основная навигация" className="flex-1 overflow-y-auto px-3">
        {/* Пять пунктов не нуждаются в заголовке над собой. */}
        <ul className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const count = counts[href];
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                    active
                      ? "rail-active font-medium text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn("size-[18px]", active && "text-open")}
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                  />
                  <span className="flex-1">{label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        "num rounded-full px-1.5 py-0.5 text-[11px] leading-none",
                        active ? "bg-open/15 text-open-ink" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {hydrated && changePending && (
          <Link
            href="/changes"
            className="mt-4 flex items-center gap-2 rounded-xl border border-open/30 bg-open-soft px-3 py-2.5 text-sm font-medium text-open-ink transition-colors hover:border-open/50"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-open" aria-hidden />
            Что изменилось
          </Link>
        )}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-3">
        <ProgressReadout view={view} />
        <ThemeToggle />
      </div>
    </aside>
  );
}

/**
 * Whose answers are open, and the way out.
 *
 * It sits above the navigation rather than buried in settings because the
 * failure it fixes is being stuck: somebody opened the demo, lost their own
 * board and had nowhere obvious to click. Now their name is the first thing on
 * the rail, and the demo says it is a demo.
 */
function ProfileCard() {
  const { ready, slot } = useProfileSession();

  if (!ready) return <div className="h-14 rounded-xl bg-muted/40" aria-hidden />;

  if (slot === undefined) {
    return (
      <Link
        href="/start"
        className="panel panel-inset flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:border-border-strong"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-border-strong text-xs text-muted-foreground">
          ?
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Войти по имени</span>
          <span className="block truncate text-xs text-muted-foreground">
            чтобы вернуться сюда потом
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      className="panel panel-inset flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:border-border-strong"
    >
      <Avatar slot={slot} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{displayName(slot)}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {slot.kind === "demo" ? "демо-данные, не твои" : "профиль в этом браузере"}
        </span>
      </span>
      <CaretUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

/**
 * Steps finished out of steps the open routes need.
 *
 * The one number in the product that goes up. Everything else counts what is
 * being lost, and a plan you are working through should show that the work
 * counts for something.
 */
function ProgressReadout({ view }: { view: RouteView }) {
  const { done, total, percent } = useProgress(view);

  if (!view.ready || total === 0) return null;

  return (
    <div className="px-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">Шаги закрыты</span>
        <span className="num font-medium">
          {done} / {total}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Выполненные шаги"
      >
        <div
          className="h-full rounded-full bg-open transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const counts = navCounts(useRouteView());

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const count = counts[href];
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-open"
                    aria-hidden
                  />
                )}
                <span className="relative">
                  <Icon
                    className={cn("size-5", active && "text-open")}
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                  />
                  {count !== undefined && count > 0 && (
                    <span className="num absolute -right-2.5 -top-1 rounded-full bg-open px-1 text-[9px] font-semibold leading-[14px] text-primary-foreground">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileHeader() {
  const changePending = useAppStore((s) => s.previous_route !== null && !s.change_seen);
  const hydrated = useHydrated();
  const { slot } = useProfileSession();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
      <Link href="/doors" className="inline-flex min-h-10 items-center">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-1">
        {hydrated && changePending && (
          <Link
            href="/changes"
            className="rounded-full border border-open/30 bg-open-soft px-2.5 py-1 text-xs font-medium text-open-ink"
          >
            Что изменилось
          </Link>
        )}
        <ThemeToggle compact />
        <Link
          href={slot === undefined ? "/start" : "/profile"}
          aria-label={slot === undefined ? "Войти по имени" : `Профиль: ${displayName(slot)}`}
          className="grid size-9 place-items-center rounded-full"
        >
          {slot === undefined ? (
            <span className="grid size-8 place-items-center rounded-full border border-dashed border-border-strong text-xs text-muted-foreground">
              ?
            </span>
          ) : (
            <Avatar slot={slot} size={32} />
          )}
        </Link>
      </div>
    </header>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      // Gated on hydration like the icon below it: the server cannot know the
      // stored theme, so an ungated label disagrees with itself on first paint
      // — a real hydration mismatch, and a screen reader reading the wrong one.
      aria-label={hydrated && dark ? "Включить светлую тему" : "Включить тёмную тему"}
      className={cn(
        "flex items-center gap-2 rounded-xl text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
        compact ? "size-9 justify-center" : "w-full px-3 py-2",
      )}
    >
      {hydrated && dark ? (
        <MoonIcon className="size-[18px]" aria-hidden />
      ) : (
        <SunIcon className="size-[18px]" aria-hidden />
      )}
      {!compact && <span>{hydrated && dark ? "Тёмная тема" : "Светлая тема"}</span>}
    </button>
  );
}
