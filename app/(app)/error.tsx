"use client";

import { useEffect } from "react";

import { ErrorState } from "@/features/route/ui";

/**
 * The last line of defence for an application screen.
 *
 * Something unexpected threw — a damaged catalogue record, a browser API that
 * behaved differently, a bug. The applicant sees one calm sentence and a way
 * forward, never a stack trace and never a provider's error text. The detail
 * goes to the console, where it is useful to whoever has to fix it.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Stepwise: экран не отрисовался", error);
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
