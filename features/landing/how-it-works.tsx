"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";

import { AppWindow } from "@/components/ui/app-window";
import { cn } from "@/lib/utils";

/**
 * Second screen: the four things the product does, advanced by scroll.
 *
 * The section is four viewports tall with a pinned inner frame. Scrolling
 * through it moves the active step 01 to 04 without the page appearing to move,
 * then releases into the next screen.
 *
 * The artwork is a windowed screenshot rather than a clipped shape. The earlier
 * version chopped the screenshots into geometric masks, which looked like
 * texture instead of like software; a window frame with traffic lights tells the
 * eye it is looking at an application before it reads a single pixel.
 *
 * All four screenshots are stacked and crossfaded by opacity. Swapping a single
 * <img> would flash on every step change, and mounting and unmounting would
 * re-request the file.
 *
 * Screens are captured from the running build by `npm run shots`, so the
 * landing shows real computed dates and stays true after a UI change.
 */
interface Step {
  num: string;
  name: string;
  route: string;
  image: string;
  alt: string;
  detail: string;
}

/**
 * Scroll distance per step. A full viewport each took two wheel gestures to
 * advance one step, which broke the rhythm; this lands near one gesture while
 * still giving each step a beat of its own.
 */
const STEP_VH = 65;

const STEPS: readonly Step[] = [
  {
    num: "01",
    name: "Короткое интервью",
    route: "stepwise.app/start",
    image: "/landing/interview.webp",
    alt: "Экран интервью: поле свободного текста, страна и класс",
    detail:
      "Четыре шага: свободный текст о себе, цель, уже сданные экзамены и шесть коротких вопросов. AI раскладывает написанное по полям анкеты, и на этом его работа заканчивается.",
  },
  {
    num: "02",
    name: "Обратный план",
    route: "stepwise.app/roadmap",
    image: "/landing/roadmap.webp",
    alt: "Экран плана: обязательные шаги, разложенные по месяцам",
    detail:
      "К каждому дедлайну прибавлено время, которое шаг реально занимает, поэтому «начать не позже» всегда раньше официального срока. Работа, которая засчитывается нескольким путям сразу, стоит одной строкой.",
  },
  {
    num: "03",
    name: "Сравнение путей",
    route: "stepwise.app/compare",
    image: "/landing/compare.webp",
    alt: "Экран сравнения: два пути рядом по срокам и расходам",
    detail:
      "Два пути рядом: когда закроется каждый, на каком шаге держится, сколько работы осталось и во что обойдётся год. Пометка «проще» показывает, где нагрузка ниже, но выбор остаётся за тобой.",
  },
  {
    num: "04",
    name: "Ближайший шаг",
    route: "stepwise.app/doors",
    image: "/landing/next-step.webp",
    alt: "Экран дверей: карточка одного ближайшего шага",
    detail:
      "Одно действие на пятнадцать минут вместо списка дел. Рядом стоит, сколько путей оно удерживает открытыми и до какой даты его нужно начать, чтобы успеть.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  // 0 when the pin engages, 1 when it releases.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(value * STEPS.length)));
    // Fires four times across the whole section, not once per frame.
    setIndex((current) => (current === next ? current : next));
  });

  /** Keyboard and tap jump the page to where that step lives. */
  const goTo = (target: number) => {
    const node = ref.current;
    if (!node) return;
    const top = node.offsetTop + node.offsetHeight * ((target + 0.5) / STEPS.length);
    window.scrollTo({ top: top - window.innerHeight / 2, behavior: "smooth" });
  };

  const active = STEPS[index] ?? STEPS[0]!;

  return (
    <section
      ref={ref}
      className="dark relative bg-black"
      style={{ height: `${STEPS.length * STEP_VH}vh` }}
      aria-label="Как это работает"
    >
      <div className="sticky top-0 flex h-[100dvh] flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 pb-14 pt-12 sm:px-6 md:flex-row md:items-center md:gap-10 md:pb-20 md:pt-16 lg:px-8">
          {/* Left: the four steps, plus the detail of whichever is live. */}
          <div className="flex min-w-0 shrink-0 flex-col justify-center md:w-[34%]">
            <ol className="flex flex-col gap-3 md:gap-6">
              {STEPS.map((step, i) => {
                const on = i === index;
                const [head, ...rest] = step.name.split(" ");
                return (
                  <li key={step.num}>
                    <button
                      type="button"
                      aria-current={on ? "step" : undefined}
                      onFocus={() => goTo(i)}
                      onClick={() => goTo(i)}
                      className="block w-full cursor-pointer text-left"
                    >
                      <span className="flex items-start gap-3 md:gap-5">
                        <span
                          className={cn(
                            "num mt-1.5 text-sm font-semibold transition-colors duration-500 md:text-lg",
                            on ? "text-orange-500" : "text-zinc-600",
                          )}
                        >
                          {step.num}
                        </span>
                        <span
                          className={cn(
                            "text-2xl font-black uppercase leading-[0.9] tracking-tighter transition-all duration-500 sm:text-4xl md:text-[2.6rem] lg:text-5xl",
                            on
                              ? "translate-x-1 text-white md:translate-x-2"
                              // #63636e, measured 3.54:1 on black. Darker than
                              // zinc-500 so the live step still leads, and above
                              // the 3:1 floor for text this size.
                              : "translate-x-0 text-[#63636e]",
                          )}
                        >
                          {head}
                          {rest.length > 0 && (
                            <>
                              <br />
                              {rest.join(" ")}
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* The detail of the live step, crossfaded in place. */}
            <motion.p
              key={active.num}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-[46ch] text-pretty text-sm leading-relaxed text-zinc-400 md:mt-10 md:text-base"
            >
              {active.detail}
            </motion.p>
          </div>

          {/* Right: the product, in a window. */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <AppWindow title={active.route} className="w-full max-w-[820px]">
              <div className="relative aspect-[4/3] w-full">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  aria-hidden={i !== index}
                  className="absolute inset-0"
                  initial={false}
                  animate={
                    reduce
                      ? { opacity: i === index ? 1 : 0 }
                      : { opacity: i === index ? 1 : 0, scale: i === index ? 1 : 1.03 }
                  }
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image
                    src={step.image}
                    alt={i === index ? step.alt : ""}
                    fill
                    sizes="(min-width: 768px) 820px, 100vw"
                    className="object-cover object-left-top"
                    // Eager on all four: they are the content of this screen,
                    // and letting them decode at the moment the hero releases
                    // put a visible hitch in the handover.
                    loading="eager"
                    priority={i === 0}
                  />
                </motion.div>
              ))}
              </div>
            </AppWindow>
          </div>
        </div>

        {/* Which of the four is on screen. Four ticks, not a scrollbar. */}
        <div className="flex shrink-0 justify-center gap-2 pb-7 md:pb-9" aria-hidden>
          {STEPS.map((step, i) => (
            <span
              key={step.num}
              className={cn(
                "h-0.5 w-8 rounded-full transition-colors duration-500",
                i === index ? "bg-orange-500" : "bg-white/15",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
