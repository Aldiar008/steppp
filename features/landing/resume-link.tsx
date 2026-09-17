"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

import { useHydrated, useStepwise } from "@/lib/store";

/**
 * Returning applicants should not be told to start over. Rendered only after
 * hydration, since the answer lives in browser storage.
 */
export function ResumeLink() {
  const hydrated = useHydrated();
  const hasProfile = useStepwise((s) => s.profile !== null);

  if (!hydrated || !hasProfile) return null;

  return (
    <Link
      href="/doors"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
    >
      Вернуться к своим дверям
      <ArrowRightIcon className="size-4" aria-hidden />
    </Link>
  );
}
