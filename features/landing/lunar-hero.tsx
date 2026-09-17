"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

import { Wordmark } from "@/components/brand";
import { useMediaQuery } from "@/lib/use-media-query";
import { ResumeLink } from "./resume-link";

/**
 * Full-bleed landing hero.
 *
 * Scroll drives the scene, not a click and not a timer. `scrollYProgress` is
 * written into a plain ref that the render loop reads every frame, so the ring
 * unfolds exactly as far as the visitor has scrolled and rewinds when they
 * scroll back. Nothing here re-renders React: the ref is mutated outside the
 * component tree and three.js picks it up inside `useFrame`.
 *
 * The section is a little under two viewports tall with a pinned inner frame.
 * Without the pin the moon reached its closest exactly as the hero left the
 * screen, so the one frame worth looking at was never on screen. Pinned, the
 * page holds still while the lens closes in and the copy recedes, and the zoom
 * runs right up to the release so there is no pause between the two screens.
 *
 * Two things keep the cost off the visitor:
 *   - `ssr: false` plus a poster layer means the headline and the call to
 *     action paint from server HTML on the first frame, so LCP lands on text.
 *   - `prefers-reduced-motion` freezes the scene with the ring already formed.
 *
 * Scrolling is the other constraint. OrbitControls sets `touch-action: none` on
 * its canvas, so a full-height interactive canvas would make the landing page
 * impossible to scroll on a phone. The canvas is inert and `pointer-events-none`
 * below `md`; above it, dragging orbits the moon and the wheel still scrolls.
 */
const LunarScene = dynamic(
  () => import("@/components/ui/lunar-gravity-card").then((m) => m.LunarScene),
  { ssr: false },
);

/** The ring finishes forming at this point of the pinned scroll. */
const REVEAL_AT = 0.5;
/**
 * The lens keeps closing right up to the moment the pin releases. An earlier
 * version finished at 0.72 and then held, which read as the page freezing for a
 * beat before the next screen arrived.
 */
const ZOOM_AT = 0.97;

export function LunarHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // 0 when the pin engages, 1 when it releases.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Both read by the render loop every frame; neither triggers a React render.
  const revealRef = useRef(0);
  const zoomRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const p = Math.max(0, Math.min(1, value));
    revealRef.current = reduceMotion ? 1 : Math.min(1, p / REVEAL_AT);
    zoomRef.current = reduceMotion ? 0 : Math.min(1, p / ZOOM_AT);
  });

  // The moon stays put: the sense of it approaching comes entirely from the
  // lens. Scaling a layer that holds a WebGL canvas forces it to re-rasterise
  // every frame, which is what made scrolling back up stutter.
  const moonOpacity = useTransform(scrollYProgress, [0, 0.9, 1], [1, 1, 0.35]);

  // The copy recedes: smaller, dimmer, drifting back and up. Two objects moving
  // in opposite directions read as depth, and it clears the frame so the moon
  // can actually be seen at its closest.
  // Every ramp carries an explicit terminal stop. A two-stop range that ends at
  // exactly 0 was measured running back up to 1 past its input range instead of
  // holding, so the copy faded out and then reappeared over the moon.
  const copyY = useTransform(scrollYProgress, [0, 0.5, 1], ["0%", "-18%", "-18%"]);
  const copyScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.76, 0.76]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.38, 1], [1, 0, 0]);

  const still = reduceMotion;

  return (
    <section ref={sectionRef} className="relative h-[180vh] w-full bg-black">
      <div className="sticky top-0 isolate flex h-[100dvh] w-full flex-col overflow-hidden bg-black">
      <motion.div
        aria-hidden
        style={still ? undefined : { opacity: moonOpacity }}
        className={
          // Explicit edges rather than `inset-0` plus an override: two rules of
          // equal specificity would leave the winner up to stylesheet order.
          // Pushed down on phones so the moon sits below the copy, pushed right
          // on desktop so it sits beside it.
          "pointer-events-none absolute bottom-0 left-0 right-0 top-[14%] z-0 " +
          "md:pointer-events-auto md:left-[22%] md:top-0"
        }
      >
        <LunarScene
          interactive={isDesktop && !reduceMotion}
          animate={!reduceMotion}
          progressRef={revealRef}
          zoomRef={zoomRef}
          cameraPosition={isDesktop ? [0, 3.4, 8.6] : [0, 3.8, 9.6]}
          fov={isDesktop ? 42 : 46}
          fovTo={isDesktop ? 30 : 33}
        />
      </motion.div>

      {/* Scrim. Down the page on mobile, across it on desktop. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black via-black/85 to-transparent md:bg-gradient-to-r md:from-black md:via-black/80 md:to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-black to-transparent"
      />

      <header className="relative z-30 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Wordmark className="text-zinc-50" />
        <Link
          href="/start"
          className="rounded-lg bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90"
        >
          Начать
        </Link>
      </header>

      {/* pointer-events-none is load-bearing: this column is a transparent box
          the full size of the hero sitting on top of the canvas, so without it
          every drag aimed at the moon would land here instead. Each control
          below switches pointer events back on for itself. */}
      <motion.div
        data-hero-copy=""
        style={
          still
            ? undefined
            : { y: copyY, scale: copyScale, opacity: copyOpacity, transformOrigin: "left center" }
        }
        className="pointer-events-none relative z-20 mx-auto flex w-full max-w-6xl flex-1 items-start px-4 pb-20 pt-8 sm:px-6 sm:pb-24 md:items-center md:pt-6 lg:px-8"
      >
        <div className="max-w-[36rem]">
          <h1 className="text-balance text-[2.25rem] font-semibold leading-[1.05] tracking-tighter text-zinc-50 sm:text-5xl lg:text-[3.5rem]">
            Сколько путей поступления
            <span className="block bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              у тебя ещё открыто
            </span>
          </h1>

          <p className="mt-6 max-w-[44ch] text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
            Stepwise считает, когда закроется каждый путь и какое одно действие удерживает максимум
            вариантов.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/start"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-950 transition-transform hover:-translate-y-px active:translate-y-0"
            >
              Пройти интервью за 4 минуты
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
            <span className="pointer-events-auto [&_a]:text-zinc-400 [&_a:hover]:text-zinc-50">
              <ResumeLink />
            </span>
          </div>

          <p className="mt-8 text-xs text-zinc-500">
            {reduceMotion
              ? "Движение отключено: в системе включён режим уменьшенной анимации."
              : "Прокручивай: луна подходит вплотную, кольцо разворачивается."}
          </p>
        </div>
      </motion.div>
      </div>
    </section>
  );
}
