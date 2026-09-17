import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

/**
 * Every screen answers the same three questions in the same place: where am I,
 * what is this screen for, what do I do here.
 *
 * There is deliberately no label above the title. A tracked-out capitalised
 * word saying «СРАВНЕНИЕ» over a heading that already says what the screen is,
 * on a screen the navigation has already highlighted, is chrome: it repeats the
 * rail, pushes the real heading down, and is one of the surest tells of an
 * interface nobody made a decision about. What the eyebrow used to carry that
 * was genuinely information — a city, a country — belongs in the lede.
 */
export function PageHeader({
  title,
  lede,
  back,
  actions,
  className,
}: {
  title: string;
  lede?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6", className)}>
      {back && (
        <Link
          href={back.href}
          className="mb-2 -ml-1 inline-flex min-h-9 items-center gap-1 px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <CaretLeftIcon className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-balance text-2xl font-semibold sm:text-[2rem] sm:leading-[1.15]">
            {title}
          </h1>
          {lede && (
            <div className="mt-2 max-w-[62ch] text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {lede}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
