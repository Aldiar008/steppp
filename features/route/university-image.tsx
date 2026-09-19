"use client";

import { useState } from "react";
import { ArrowsOutIcon } from "@phosphor-icons/react/dist/ssr";

import { UniversityCrest, crestInitials } from "@/components/university-crest";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { photoOf } from "@/data/university-photos";
import { cn } from "@/lib/utils";

/**
 * The picture at the top of a university's page.
 *
 * A route in this catalogue used to open onto a wall of dates with a two-letter
 * square beside the name, and eleven Kazakhstani universities whose names all
 * begin «Казахский национальный…» were, on that page, indistinguishable. The
 * picture is what makes them different places. It is also the only ornament on
 * a screen whose whole job is a deadline, which is why it sits above the fold
 * and then gets out of the way: one band, no carousel, nothing that moves.
 *
 * Tapping it opens the full frame. `UniversityCrest` decides what is actually
 * drawn — a real photograph when `data/university-photos.ts` has one, and the
 * generated sky otherwise — and the caption says which of the two a person is
 * looking at, because a drawing presented as a campus photo would be exactly
 * the kind of plausible-looking thing this product refuses to ship.
 */
export function UniversityImage({
  programId,
  org,
  place,
  className,
}: {
  programId: string;
  org: string;
  /** City and country, drawn under the name. */
  place: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const photo = photoOf(programId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Открыть изображение: ${org}`}
        className={cn(
          "group relative block w-full overflow-hidden rounded-2xl border border-border",
          "aspect-[16/9] sm:aspect-[12/5]",
          className,
        )}
      >
        {/* Без инициалов: имя университета и так набрано поверх полосой
            ниже, а широкий кадр всё равно срезает их вместе с горизонтом. */}
        <UniversityCrest seed={org} programId={programId} />

        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-3 pt-10 text-left">
          <span className="block truncate text-base font-medium text-white sm:text-lg">{org}</span>
          <span className="block truncate text-xs text-white/70">{place}</span>
        </span>

        <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/55 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ArrowsOutIcon className="size-4" aria-hidden />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
          <DialogTitle className="truncate pr-8">{org}</DialogTitle>
          <div className="aspect-[8/5] overflow-hidden rounded-xl border border-border">
            <UniversityCrest seed={org} programId={programId} label={crestInitials(org)} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {photo === undefined ? (
              <>
                Это не фотография кампуса. Небо нарисовано из названия университета: одно и то же
                имя всегда даёт одну и ту же картинку, поэтому её можно узнавать — но выдавать её за
                снимок {place} мы не будем.
              </>
            ) : (
              photo.credit
            )}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
