"use client";

import { motion, useReducedMotion } from "motion/react";

import { DoorGlyph } from "@/components/door-glyph";
import { StatusChip } from "@/components/status";
import { cn } from "@/lib/utils";
import type { DoorStatus } from "@/types/domain";

/**
 * The hero visual: four doors at different stages of closing.
 *
 * It animates once on load, in sequence, because the sequence is the argument:
 * the routes are not equally urgent. It does not loop, and it collapses to a
 * static board under reduced motion.
 *
 * The numbers are illustrative and labelled as such. This is the landing page,
 * not a result screen, and inventing a specific date here would undercut the
 * entire honesty claim the page is making one section below.
 */
const SAMPLE: ReadonlyArray<{ title: string; status: DoorStatus; days: number | null }> = [
  { title: "Стипендия с подачей через посольство", status: "critical", days: 11 },
  { title: "Заявка в британский вуз", status: "at_risk", days: 38 },
  { title: "Государственный вуз в Европе", status: "open", days: 176 },
  { title: "Грант в своей стране", status: "open", days: 209 },
];

export function ClosingDoorsDemo({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div className={cn("surface p-4 sm:p-5", className)} aria-label="Пример экрана путей">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="label-eyebrow">Пример</p>
        <p className="text-xs text-muted-foreground">так выглядит результат</p>
      </div>

      <ul className="space-y-2.5">
        {SAMPLE.map((item, index) => (
          <motion.li
            key={item.title}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
          >
            <DoorGlyph status={item.status} daysLeft={item.days} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                закроется через <span className="num">{item.days}</span> дн.
              </p>
            </div>
            <StatusChip status={item.status} />
          </motion.li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted-foreground">
        Иллюстрация. Твои сроки посчитаются по твоим ответам.
      </p>
    </div>
  );
}
