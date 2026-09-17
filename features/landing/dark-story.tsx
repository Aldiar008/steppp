"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRightIcon,
  CalculatorIcon,
  LinkSimpleIcon,
  ProhibitIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

import { Wordmark } from "@/components/brand";
import { ACTIONS, PROGRAMS, SOURCES } from "@/data/catalog";
import { Component as AsmrBackground } from "@/components/ui/asmr-background";
import { ClosingDoorsDemo } from "./closing-doors-demo";
import { Coverage } from "./coverage";

/**
 * Everything after the first two screens, as one continuous dark surface.
 *
 * The particle field is a single pinned layer: `sticky top-0` with a matching
 * negative bottom margin, so it holds the viewport while the content scrolls
 * over it and ends exactly where this block ends. That is what removes the
 * seams: no section here paints a background, draws a top border, or changes
 * tone. Rhythm and glass panels carry the separation instead.
 *
 * The whole block is marked `dark` so the shared tokens resolve to their dark
 * values regardless of the visitor's theme, matching the two screens above it.
 */
export function DarkStory() {
  const reduce = useReducedMotion();

  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.25 },
        transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div className="dark relative isolate bg-black text-zinc-100">
      {/* Pinned background. Negative margin pulls the content back over it. */}
      <div
        aria-hidden
        className="pointer-events-none sticky top-0 z-0 -mb-[100dvh] h-[100dvh] w-full"
      >
        <AsmrBackground background="0, 0, 0" density={900} />
        {/* Softens the handover from the black section above and into the page end. */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      <div className="relative z-10">
        {/* 03 The one idea, stated once. */}
        <motion.section
          {...reveal}
          className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8"
        >
          <div className="max-w-[58ch]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              Точка невозврата
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Дедлайн подачи и последний день, когда ещё можно начать, это разные даты
            </h2>
            <p className="mt-5 text-pretty leading-relaxed text-zinc-400">
              Заявка в британский вуз закрывается в конце января. Но языковой экзамен идёт около
              двух месяцев от записи до официального результата. Значит, реальный срок наступает не
              в январе, а в ноябре. Stepwise считает этот второй срок для каждого пути и показывает,
              какой шаг его определяет.
            </p>
          </div>

          <ol className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "Дедлайн подачи",
                t: "Дата, которую публикует университет",
                d: "Единственное число, которое обычно видит абитуриент.",
              },
              {
                n: "Время на работу",
                t: "Сколько реально занимает каждый шаг",
                d: "Экзамен, апостиль, рекомендации, перевод документов.",
              },
              {
                n: "Точка невозврата",
                t: "Первое минус второе",
                d: "Последний день, когда путь ещё достижим. Его и показывает Stepwise.",
              },
            ].map((item, index) => (
              <li key={item.n} className="glass-panel p-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  <span className="num mr-2 text-zinc-400">0{index + 1}</span>
                  {item.n}
                </p>
                <p className="font-medium text-zinc-100">{item.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.d}</p>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* 04 What the applicant ends up looking at. */}
        <motion.section
          {...reveal}
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
            <div>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Сверху то, где времени меньше всего
              </h2>
              <p className="mt-5 max-w-[52ch] text-pretty leading-relaxed text-zinc-400">
                Список отсортирован по близости точки невозврата, а не по рейтингу университета.
                Порядок отвечает на вопрос «что я теряю первым», а не «что престижнее».
              </p>

              <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
                {/* Считается из каталога, а не вписано руками: страница, которая
                    обещает, что ни одно число не выдумано, не может врать о
                    собственном размере. Раньше здесь стояло «14 путей», пока
                    каталог рос до нынешних размеров. */}
                {[
                  { k: "путей в каталоге", v: PROGRAMS.length },
                  { k: "обязательных шагов", v: ACTIONS.length },
                  { k: "источников", v: SOURCES.length },
                ].map((stat) => (
                  <div key={stat.k} className="glass-quiet p-4">
                    <dd className="num text-2xl font-semibold text-zinc-100">{stat.v}</dd>
                    <dt className="mt-1 text-xs leading-snug text-zinc-400">{stat.k}</dt>
                  </div>
                ))}
              </dl>
            </div>

            <ClosingDoorsDemo className="glass-panel border-0 bg-transparent" />
          </div>
        </motion.section>

        {/* 05 Which countries, and which universities by name. Same pinned
            star field, same glass, no background of its own — the section has
            to read as the next paragraph of the page, not as a new slide. */}
        <motion.section {...reveal}>
          <Coverage />
        </motion.section>

        {/* 06 Where the numbers come from. */}
        <motion.section
          {...reveal}
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-16">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                Откуда числа
              </p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Считает калькулятор, а не нейросеть
              </h2>
            </div>

            <ul className="grid gap-4">
              <HonestyItem
                icon={CalculatorIcon}
                title="Даты считает детерминированный движок"
                body="Одни и те же ответы всегда дают одни и те же сроки. Модуль расчёта покрыт тестами, включая проверку, что ни одна дата не появляется из ниоткуда."
              />
              <HonestyItem
                icon={ProhibitIcon}
                title="AI не может назвать дату"
                body="Он делает ровно две вещи: раскладывает твой текст по полям анкеты и пересказывает готовый расчёт словами. В схеме его ответа нет полей под дату, балл или вероятность."
              />
              <HonestyItem
                icon={LinkSimpleIcon}
                title="У каждой даты есть источник"
                body="В этой версии весь каталог помечен как демонстрационные данные, а рядом стоит ссылка на официальную страницу. Мы предпочитаем честную пометку красивому числу."
              />
            </ul>
          </div>
        </motion.section>

        {/* 07 Close. */}
        <motion.section
          {...reveal}
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="glass-panel px-6 py-14 text-center sm:px-12 sm:py-20">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Четыре минуты, и ты увидишь свою картину сроков
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-pretty text-zinc-400">
              Без регистрации. Ответы остаются в твоём браузере.
            </p>
            <Link
              href="/start"
              className="mt-9 inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-6 py-3.5 text-sm font-medium text-zinc-950 transition-transform hover:-translate-y-px active:translate-y-0"
            >
              Начать
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          </div>
        </motion.section>

        <footer className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-8 text-xs text-zinc-400">
            <Wordmark className="text-zinc-400" />
            <p className="max-w-[52ch] leading-relaxed">
              Stepwise помогает планировать сроки и не гарантирует поступление. Перед подачей всегда
              сверяй даты на сайте программы.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function HonestyItem({
  icon: IconComponent,
  title,
  body,
}: {
  icon: Icon;
  title: string;
  body: string;
}) {
  return (
    <li className="glass-quiet flex gap-4 p-5">
      <IconComponent className="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden />
      <div>
        <p className="font-medium text-zinc-100">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{body}</p>
      </div>
    </li>
  );
}
