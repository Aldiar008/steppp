"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowsLeftRightIcon,
  CaretUpDownIcon,
  CompassIcon,
  DoorOpenIcon,
  MoonIcon,
  PathIcon,
  PlayCircleIcon,
  StethoscopeIcon,
  SunIcon,
  TargetIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useTheme } from "next-themes";
import type { Icon } from "@phosphor-icons/react";

import { Wordmark } from "@/components/brand";
import { Avatar } from "@/components/avatar";
import { useAuthSession } from "@/features/auth/use-auth-session";
import { useProgress } from "@/features/route/use-progress";
import { useRouteView, type RouteView } from "@/features/route/use-route";
import { useAppStore } from "@/lib/state/app-store";
import { exitDemoMode } from "@/lib/state/demo-mode";
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

/**
 * The rail, redrawn as a fixed brand surface (see `styles/app-theme.css`'s
 * `--sidebar*` block): dark indigo/teal, the same regardless of the light/dark
 * toggle, because the toggle governs the reading surface, not the brand rail —
 * exactly how the OnePrep reference this redesign follows never offers a
 * light sidebar either. Hooks and data are unchanged from before; only the
 * markup's colour and grouping changed.
 */
export function DesktopNav() {
  const pathname = usePathname();
  const changePending = useAppStore((s) => s.previous_route !== null && !s.change_seen);
  const hydrated = useHydrated();
  const view = useRouteView();
  const counts = navCounts(view);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <Link
        href="/doors"
        className="flex items-center px-5 py-5 transition-opacity hover:opacity-80"
      >
        <Wordmark />
      </Link>

      <nav aria-label="Основная навигация" className="flex-1 overflow-y-auto px-3">
        <p className="px-3 pt-2 pb-2 text-[10px] font-semibold tracking-wider text-(--sidebar-muted) uppercase">
          Поступление
        </p>
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
                      ? "rail-active font-medium text-sidebar-foreground"
                      : "text-(--sidebar-muted) hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon
                    className={cn("size-[18px]", active && "text-sidebar-primary")}
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                  />
                  <span className="flex-1">{label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        "num rounded-full px-1.5 py-0.5 text-[11px] leading-none",
                        active
                          ? "bg-sidebar-primary/20 text-sidebar-primary"
                          : "bg-sidebar-accent text-(--sidebar-muted)",
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

        {/* A sixth destination on purpose, not a seventh nav item: this is a
            standalone module a student opens occasionally, not a screen in the
            daily admission loop the five icons above are built around. */}
        <Link
          href="/profession"
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-(--sidebar-muted) transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
        >
          <CompassIcon className="size-[18px]" aria-hidden />
          Найти профессию
        </Link>

        {hydrated && changePending && (
          <Link
            href="/changes"
            className="mt-4 flex items-center gap-2 rounded-xl border border-sidebar-primary/30 bg-sidebar-primary/10 px-3 py-2.5 text-sm font-medium text-sidebar-primary transition-colors hover:border-sidebar-primary/50"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-sidebar-primary" aria-hidden />
            Что изменилось
          </Link>
        )}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-3">
        <ProgressReadout view={view} />
        <ThemeToggle />
        <ProfileCard />
      </div>
    </aside>
  );
}

/**
 * Whose answers are open, and the way out.
 *
 * Pinned at the very bottom of the rail, avatar-and-name, the way the
 * reference pins its own identity slot — the failure it fixes is being stuck:
 * somebody opened the demo, lost their own board and had nowhere obvious to
 * click. Now their name is the last thing on the rail, and the demo says it
 * is a demo.
 */
function ProfileCard() {
  const { status, user } = useAuthSession();
  const router = useRouter();

  if (status === "loading") return <div className="h-12 rounded-xl bg-sidebar-accent/40" aria-hidden />;

  if (status === "demo") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-primary/40 bg-sidebar-primary/10 p-2.5">
          <PlayCircleIcon className="size-6 shrink-0 text-sidebar-primary" weight="duotone" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-sidebar-foreground">Демо-режим</span>
            <span className="block truncate text-xs text-(--sidebar-muted)">Амир, 11 класс, Шымкент</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            exitDemoMode();
            router.push("/start");
          }}
          className="w-full rounded-xl border border-sidebar-border px-3 py-2 text-left text-xs font-medium text-(--sidebar-muted) transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          Выйти из демо → зарегистрироваться
        </button>
      </div>
    );
  }

  if (status !== "student" || user === null) {
    return (
      <Link
        href="/start"
        className="flex w-full items-center gap-3 rounded-xl border border-sidebar-border p-2.5 text-left transition-colors hover:bg-sidebar-accent/60"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-sidebar-border text-xs text-(--sidebar-muted)">
          ?
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-sidebar-foreground">Войти</span>
          <span className="block truncate text-xs text-(--sidebar-muted)">чтобы вернуться сюда потом</span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      className="flex w-full items-center gap-3 rounded-xl border border-sidebar-border p-2.5 text-left transition-colors hover:bg-sidebar-accent/60"
    >
      <Avatar name={user.name} email={user.email} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-sidebar-foreground">
          {user.name || user.email}
        </span>
        <span className="block truncate text-xs text-(--sidebar-muted)">{user.email}</span>
      </span>
      <CaretUpDownIcon className="size-4 shrink-0 text-(--sidebar-muted)" aria-hidden />
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
        <span className="text-(--sidebar-muted)">Шаги закрыты</span>
        <span className="num font-medium text-sidebar-foreground">
          {done} / {total}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sidebar-accent"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Выполненные шаги"
      >
        <div
          className="h-full rounded-full bg-sidebar-primary transition-[width] duration-500"
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
      className="fixed inset-x-0 bottom-0 z-40 bg-sidebar text-sidebar-foreground md:hidden"
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
                  active ? "text-sidebar-foreground" : "text-(--sidebar-muted)",
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-sidebar-primary"
                    aria-hidden
                  />
                )}
                <span className="relative">
                  <Icon
                    className={cn("size-5", active && "text-sidebar-primary")}
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                  />
                  {count !== undefined && count > 0 && (
                    <span className="num absolute -right-2.5 -top-1 rounded-full bg-sidebar-primary px-1 text-[9px] font-semibold leading-[14px] text-sidebar-primary-foreground">
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
  const { status, user } = useAuthSession();
  const router = useRouter();
  const signedIn = (status === "student" || status === "demo") && user !== null;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
      <Link href="/doors" className="inline-flex min-h-10 items-center gap-2">
        <Wordmark />
        {status === "demo" && (
          <span className="rounded-full border border-sidebar-primary/40 bg-sidebar-primary/10 px-2 py-0.5 text-[10px] font-medium text-sidebar-primary">
            Демо
          </span>
        )}
      </Link>
      <div className="flex items-center gap-1">
        {status === "demo" && (
          <button
            type="button"
            onClick={() => {
              exitDemoMode();
              router.push("/start");
            }}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-(--sidebar-muted) transition-colors hover:text-sidebar-foreground"
          >
            Выйти
          </button>
        )}
        {hydrated && changePending && (
          <Link
            href="/changes"
            className="rounded-full border border-sidebar-primary/30 bg-sidebar-primary/10 px-2.5 py-1 text-xs font-medium text-sidebar-primary"
          >
            Что изменилось
          </Link>
        )}
        <Link
          href="/profession"
          aria-label="Найти профессию"
          className="grid size-9 place-items-center rounded-full text-(--sidebar-muted) transition-colors hover:text-sidebar-foreground"
        >
          <CompassIcon className="size-[18px]" aria-hidden />
        </Link>
        <ThemeToggle compact />
        <Link
          href={signedIn ? "/profile" : "/start"}
          aria-label={signedIn ? `Профиль: ${user.name || user.email}` : "Войти"}
          className="grid size-9 place-items-center rounded-full"
        >
          {signedIn ? (
            <Avatar name={user.name} email={user.email} size={32} />
          ) : (
            <span className="grid size-8 place-items-center rounded-full border border-dashed border-sidebar-border text-xs text-(--sidebar-muted)">
              ?
            </span>
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
        "flex items-center gap-2 rounded-xl text-sm text-(--sidebar-muted) transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
