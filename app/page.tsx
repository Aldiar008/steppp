import { DarkStory } from "@/features/landing/dark-story";
import { HowItWorks } from "@/features/landing/how-it-works";
import { LunarHero } from "@/features/landing/lunar-hero";

/**
 * The landing page is one continuous dark surface from top to bottom.
 *
 *   1. LunarHero   WebGL moon, carries its own header.
 *   2. HowItWorks  the four things the product does, GSAP clip reveals.
 *   3+ DarkStory   one pinned particle field under every remaining section,
 *                  with the content floating on glass. No section below the
 *                  fold paints its own background or draws a divider, which is
 *                  what makes the whole thing read as a single page rather
 *                  than a stack of slides.
 */
export default function LandingPage() {
  return (
    <main id="main" className="flex-1 bg-black">
      <LunarHero />
      <HowItWorks />
      <DarkStory />
    </main>
  );
}
