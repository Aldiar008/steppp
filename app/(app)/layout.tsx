import { Bitter, Golos_Text } from "next/font/google";

import { DesktopNav, MobileHeader, MobileNav } from "@/components/app-nav";
import { ProfileBoot } from "@/features/account/profile-boot";
import "@/styles/app-theme.css";

/**
 * The application's own two faces, loaded here and nowhere else.
 *
 * Declaring them in this layout rather than the root one is what keeps the
 * promise about the landing: the home page never requests these files and its
 * type does not shift by a pixel.
 *
 * Golos Text carries the interface — a face drawn for Russian, which is the
 * language this product actually speaks, instead of the framework's default.
 * Bitter carries dates and screen titles: a slab serif is the lettering of
 * printed timetables and examination schedules, which is exactly what a point
 * of no return is. The pairing is one decision, spent on the one thing the
 * applicant is here to read.
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

/**
 * Application shell. A server component: the shell itself has no state, only
 * the navigation pieces and the profile boot inside it are client islands.
 *
 * `.stepwise-app` is what separates this from the landing. The landing's CSS is
 * frozen, so the application's palette, aurora and panel surfaces are scoped to
 * this wrapper instead of redefined globally — the home page renders from
 * exactly the same stylesheet it always did.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`stepwise-app ${ui.variable} ${display.variable} flex min-h-[100dvh] flex-col`}>
      <ProfileBoot />
      <DesktopNav />
      <MobileHeader />
      <main id="main" className="flex-1 pb-24 md:pb-0 md:pl-64">
        {/* Wide enough for a real dashboard: at 1440 the old 1024 cap left half
            the screen empty and pushed the board into a column. */}
        <div className="mx-auto w-full max-w-[86rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
