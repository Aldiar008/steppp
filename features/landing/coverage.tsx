import Link from "next/link";

import { CATALOG_PROVENANCE, PROGRAMS } from "@/data/catalog";
import { WorldMap } from "./world-map";

/**
 * Where the catalogue actually reaches.
 *
 * The section answers one question a visitor asks before trusting anything
 * else: is my country in here, and are these real universities or a vibe check
 * against "top schools"? So every number below is counted from the catalogue at
 * module load — country coverage, programme counts, how many deadlines the
 * source stated in full. Nothing here is typed by hand, which means the page
 * cannot drift away from the data the product runs on.
 *
 * The map beside it is the same claim in the other register: real coastlines,
 * real campus coordinates, every university nameable by tapping the city it is
 * in. See `features/landing/world-map.tsx` for why it is drawn rather than
 * fetched from a tile server.
 *
 * What this section deliberately does NOT show: a competitiveness score, a
 * chance of admission, or a reach/target/likely bucket. Stepwise has no such
 * number and will not draw one on its own landing page — the whole promise is
 * that the product states dates it can source and says "не рассчитано" when it
 * cannot.
 */

/** Страны каталога. Считается, а не вписывается: страница обещает ровно это. */
const COUNTRY_COUNT = new Set(PROGRAMS.map((program) => program.country)).size;

export function Coverage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16">
        <div className="min-w-0 max-w-[52ch]">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Конкретные университеты, а не «топовые вузы»
          </h2>
          <p className="mt-5 text-pretty leading-relaxed text-zinc-400">
            В каталоге {CATALOG_PROVENANCE.total} программ в {COUNTRY_COUNT} странах, и у каждой
            свой срок подачи со ссылкой на страницу, где вуз его опубликовал. Ни один срок не
            усреднён по стране и не придуман: если университет дату не называет, так и написано.
          </p>

          <p className="mt-5 text-pretty leading-relaxed text-zinc-400">
            Чего здесь нет намеренно: балла конкурентоспособности, процента шансов и деления на
            «дотянешься / впритык / точно возьмут». Никто не знает, кто подаст документы в этом
            году вместе с тобой, а продукт, который делает вид, что знает, врёт.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/start"
              className="inline-flex items-center rounded-lg bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-950 transition-transform hover:-translate-y-px active:translate-y-0"
            >
              Собрать свою картину
            </Link>
            <Link
              href="/sources"
              className="inline-flex min-h-11 items-center text-sm text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-100 hover:underline"
            >
              Посмотреть источники
            </Link>
          </div>
        </div>

        <CatalogueCard countries={COUNTRY_COUNT} />
      </div>

      {/* Карта во всю ширину: она и есть аргумент секции, а не иллюстрация
          рядом с текстом. В колонке шириной 27rem пятьдесят городов слипались
          в одну кляксу, и «конкретные университеты» приходилось принимать на
          слово — ровно то, чего эта секция обещает не делать. */}
      <div className="mt-12">
        <WorldMap />
      </div>
    </div>
  );
}

/**
 * What the catalogue is made of.
 *
 * The shape a visitor wants is "how much of this is actually checked" — so the
 * bars are the honest split of how each deadline got into the data, counted
 * from the catalogue itself.
 */
function CatalogueCard({ countries }: { countries: number }) {
  const rows = [
    {
      label: "Дата подтверждена источником",
      value: CATALOG_PROVENANCE.verified,
      tone: "bg-zinc-100",
    },
    {
      label: "Год выведен по циклу поступления",
      value: CATALOG_PROVENANCE.derived + CATALOG_PROVENANCE.last_cycle,
      tone: "bg-zinc-400",
    },
    {
      label: "Вуз дату не публикует",
      value: CATALOG_PROVENANCE.undated + CATALOG_PROVENANCE.demo,
      tone: "bg-zinc-700",
    },
  ];

  return (
    <section className="glass-panel p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium text-zinc-100">Что в каталоге</h3>
        <Link
          href="/sources"
          className="-my-2 inline-flex min-h-8 items-center py-2 text-xs text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-100 hover:underline"
        >
          методика
        </Link>
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="num text-5xl font-semibold leading-none text-zinc-100">
          {CATALOG_PROVENANCE.total}
        </span>
        <span className="text-sm leading-snug text-zinc-400">
          путей поступления
          <br />в {countries} странах
        </span>
      </div>

      <dl className="mt-6 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 text-xs">
            <dt className="w-[11.5rem] shrink-0 leading-snug text-zinc-400">{row.label}</dt>
            <dd className="flex flex-1 items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <span
                  className={`block h-full rounded-full ${row.tone}`}
                  style={{ width: `${(row.value / CATALOG_PROVENANCE.total) * 100}%` }}
                />
              </span>
              <span className="num w-6 text-right text-zinc-300">{row.value}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-zinc-400">
        Балла шансов и процента поступления в Stepwise нет. Есть дата, источник и пометка, насколько
        он проверен.
      </p>
    </section>
  );
}
