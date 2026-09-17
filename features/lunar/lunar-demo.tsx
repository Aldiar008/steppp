"use client";

import dynamic from "next/dynamic";
import { GlobeIcon } from "@phosphor-icons/react/dist/ssr";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Demo page for the Lunar Gravity card.
 *
 * The card is loaded dynamically with `ssr: false` for two reasons: WebGL has
 * nothing to render on the server, and three.js plus its React bindings weigh
 * more than the rest of this application put together. Keeping the import
 * behind `next/dynamic` means the bundle only reaches a visitor who opens this
 * route, and never a sixteen-year-old checking a deadline on `/doors`.
 *
 * The inline globe SVG from the original demo is replaced with the Phosphor
 * equivalent: this project standardised on one icon family and dropped
 * lucide-react, so re-adding a second set for a single glyph would undo that.
 */
const LunarGravityCard = dynamic(
  () => import("@/components/ui/lunar-gravity-card").then((m) => m.Component),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="w-full max-w-[1000px] min-h-[700px] rounded-[2.5rem] md:min-h-0 md:h-[540px]" />
    ),
  },
);

export function LunarDemo() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-zinc-950 p-4 font-sans sm:p-10">
      <div className="relative w-full max-w-[1000px]">
        <LunarGravityCard />

        <button
          type="button"
          aria-label="Сменить язык"
          className="absolute top-6 right-6 z-50 flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 backdrop-blur-md transition-all hover:scale-110 hover:bg-white/10 hover:text-white md:top-8 md:right-8"
        >
          <GlobeIcon className="size-[18px]" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export default LunarDemo;
