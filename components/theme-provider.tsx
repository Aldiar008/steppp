"use client";

import { ThemeProvider as NextThemes } from "next-themes";

/**
 * Dark by default, not "whatever the operating system says".
 *
 * The landing is black whatever the visitor's system is set to — it paints its
 * own `bg-black` and marks itself `dark` — so a visitor arriving from it into a
 * white application would experience the handover as a different product, or as
 * a bug. Starting dark makes the two the same place. The toggle in the rail is
 * untouched: anyone who wants the paper version still gets it, and the choice
 * still persists.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
