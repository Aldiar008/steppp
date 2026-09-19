import { Bitter, Golos_Text } from "next/font/google";

import "@/styles/app-theme.css";

/**
 * The parent's own shell — deliberately not `(app)`'s.
 *
 * No student sidebar, no bottom nav, no journey rail: none of that belongs
 * to a person who cannot edit anything here. This layout only borrows the
 * application's fonts and colour tokens (`.stepwise-app`), never the
 * landing's — the two stylesheets stay exactly as separate as they are
 * everywhere else. Covers both `/parent/join/[code]` (signed out or mid
 * sign-up) and `/parent/dashboard` (signed in as a parent).
 */
const ui = Golos_Text({
  variable: "--font-ui",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const display = Bitter({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`stepwise-app ${ui.variable} ${display.variable} flex min-h-[100dvh] flex-col`}>
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <span className="display text-lg font-semibold">Stepwise</span>
          <span className="text-xs text-muted-foreground">Кабинет родителя</span>
        </div>
      </header>
      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
