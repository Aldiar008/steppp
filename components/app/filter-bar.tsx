"use client";

import { MagnifyingGlassIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The OnePrep control bar: segmented view switch on the left, search on the
 * right. `segments` is real product state passed in by the caller (on
 * `/doors` this is "Все"/"В сравнении", built from `view.compareIds` — there
 * is no bookmarking feature in this product, so this is not a re-labelled
 * placeholder for one).
 */
export function FilterBar({
  segments,
  active,
  onSelect,
  onOpenFilters,
  filtersLabel = "Сортировка и фильтр",
  search,
  onSearchChange,
  searchPlaceholder = "Поиск",
  className,
}: {
  segments: readonly { id: string; label: string; count?: number }[];
  active: string;
  onSelect: (id: string) => void;
  onOpenFilters?: () => void;
  filtersLabel?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {segments.map((segment) => (
          <button
            key={segment.id}
            type="button"
            onClick={() => onSelect(segment.id)}
            aria-pressed={active === segment.id}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
              active === segment.id
                ? "border-border-strong bg-card text-foreground shadow-sm"
                : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {segment.label}
            {segment.count !== undefined && (
              <span className="num text-xs text-muted-foreground">{segment.count}</span>
            )}
          </button>
        ))}
        {onOpenFilters && (
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-transparent bg-muted px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <SlidersHorizontalIcon className="size-4" aria-hidden />
            {filtersLabel}
          </button>
        )}
      </div>

      {onSearchChange && (
        <div className="relative ml-auto min-w-0 flex-1 sm:max-w-64">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search ?? ""}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 rounded-lg bg-muted pl-8 border-transparent"
          />
        </div>
      )}
    </div>
  );
}
