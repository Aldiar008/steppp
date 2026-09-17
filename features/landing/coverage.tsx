"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";

import { CATALOG_PROVENANCE, PROGRAMS } from "@/data/catalog";
import { countryName } from "@/data/countries";

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
 * What this section deliberately does NOT show: a competitiveness score, a
 * chance of admission, or a reach/target/likely bucket. Stepwise has no such
 * number and will not draw one on its own landing page — the whole promise is
 * that the product states dates it can source and says "не рассчитано" when it
 * cannot.
 */

/* -------------------------------------------------------------------------- */
/* Geography                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Where each country is, so the plot can be drawn rather than arranged by eye.
 *
 * Plain geography — the approximate centre of each country in degrees. It is
 * the only table in this file written by hand, because latitude is not
 * something the catalogue knows.
 */
const PLACES: Readonly<Record<string, { lat: number; lon: number }>> = {
  KZ: { lat: 48.0, lon: 68.0 },
  US: { lat: 39.8, lon: -98.6 },
  GB: { lat: 54.0, lon: -2.0 },
  CA: { lat: 56.1, lon: -106.3 },
  TR: { lat: 39.0, lon: 35.0 },
  DE: { lat: 51.2, lon: 10.5 },
  SG: { lat: 1.4, lon: 103.8 },
  NL: { lat: 52.1, lon: 5.3 },
  JP: { lat: 36.2, lon: 138.3 },
  IT: { lat: 41.9, lon: 12.6 },
  HU: { lat: 47.2, lon: 19.5 },
  HK: { lat: 22.3, lon: 114.2 },
  CH: { lat: 46.8, lon: 8.2 },
  SE: { lat: 60.1, lon: 18.6 },
  PL: { lat: 51.9, lon: 19.1 },
  KR: { lat: 36.5, lon: 127.9 },
  FR: { lat: 46.2, lon: 2.2 },
  CZ: { lat: 49.8, lon: 15.5 },
  AT: { lat: 47.5, lon: 14.6 },
  AE: { lat: 23.4, lon: 53.8 },
  CN: { lat: 35.9, lon: 104.2 },
};

/** Almaty. The plot is drawn from where the applicant is standing. */
const HOME = { lat: 43.24, lon: 76.89 };

const EARTH_KM = 6371;
const RAD = Math.PI / 180;

/**
 * Координата, одинаковая на сервере и в браузере.
 *
 * Спецификация не требует от `Math.sin`, `Math.cos` и `Math.atan2` побитово
 * одинакового результата: точность тригонометрии оставлена на усмотрение
 * движка. Node и Chrome расходятся в последнем бите — 89.37284561988236 против
 * 89.37284561988237, — и React, увидев разные атрибуты, отказывается чинить
 * поддерево целиком. Два знака после запятой SVG хватает с запасом, а
 * расхождение в четырнадцатом знаке округление съедает.
 */
function fixed(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Great-circle distance in kilometres. */
function distanceKm(lat: number, lon: number): number {
  const dLat = (lat - HOME.lat) * RAD;
  const dLon = (lon - HOME.lon) * RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(HOME.lat * RAD) * Math.cos(lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing in degrees clockwise from north. */
function bearingDeg(lat: number, lon: number): number {
  const dLon = (lon - HOME.lon) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat * RAD);
  const x =
    Math.cos(HOME.lat * RAD) * Math.sin(lat * RAD) -
    Math.sin(HOME.lat * RAD) * Math.cos(lat * RAD) * Math.cos(dLon);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/* -------------------------------------------------------------------------- */
/* What the catalogue holds                                                    */
/* -------------------------------------------------------------------------- */

interface CountryCoverage {
  code: string;
  name: string;
  /** Programmes in the catalogue for this country. */
  count: number;
  /** Their universities, each named once. */
  orgs: string[];
  km: number;
  bearing: number;
}

const COVERAGE: readonly CountryCoverage[] = (() => {
  const byCode = new Map<string, { count: number; orgs: Set<string> }>();

  for (const program of PROGRAMS) {
    const entry = byCode.get(program.country) ?? { count: 0, orgs: new Set<string>() };
    entry.count += 1;
    entry.orgs.add(program.org);
    byCode.set(program.country, entry);
  }

  return [...byCode.entries()]
    .map(([code, entry]) => {
      const place = PLACES[code];
      return {
        code,
        name: countryName(code),
        count: entry.count,
        orgs: [...entry.orgs].sort((a, b) => a.localeCompare(b, "ru")),
        km: place === undefined ? 0 : Math.round(distanceKm(place.lat, place.lon)),
        bearing: place === undefined ? 0 : bearingDeg(place.lat, place.lon),
      };
    })
    // Ближние страны первыми: расстояние — это деньги на билет и виза, а не
    // вкусовщина, и для школьника из Алматы это первый фильтр.
    .sort((a, b) => a.km - b.km || b.count - a.count);
})();

const FURTHEST = Math.max(...COVERAGE.map((item) => item.km));
const BIGGEST = Math.max(...COVERAGE.map((item) => item.count));

/* -------------------------------------------------------------------------- */
/* Section                                                                     */
/* -------------------------------------------------------------------------- */

export function Coverage() {
  const [index, setIndex] = useState(0);
  const active = COVERAGE[index];

  // Каталог не бывает пустым, но проверка стоит здесь, а не в вере в это.
  if (active === undefined) return null;

  const go = (step: number) =>
    setIndex((current) => (current + step + COVERAGE.length) % COVERAGE.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16">
        <div className="min-w-0 max-w-[52ch]">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Конкретные университеты, а не «топовые вузы»
          </h2>
          <p className="mt-5 text-pretty leading-relaxed text-zinc-400">
            В каталоге {CATALOG_PROVENANCE.total} программ в {COVERAGE.length} странах, и у каждой
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

        {/* min-w-0: у грид-элемента минимальная ширина по умолчанию равна
            ширине содержимого, а `truncate` в списке вузов ставит nowrap —
            и одно длинное название растягивало колонку за край экрана. */}
        <div className="min-w-0 space-y-4">
          <CatalogueCard />
          <CountryCard active={active} index={index} onGo={go} onPick={setIndex} />
        </div>
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
function CatalogueCard() {
  const rows = [
    {
      label: "Дата подтверждена источником",
      value: CATALOG_PROVENANCE.verified,
      tone: "bg-emerald-400/80",
    },
    {
      label: "Год выведен по циклу поступления",
      value: CATALOG_PROVENANCE.derived + CATALOG_PROVENANCE.last_cycle,
      tone: "bg-amber-400/80",
    },
    {
      label: "Вуз дату не публикует",
      value: CATALOG_PROVENANCE.undated + CATALOG_PROVENANCE.demo,
      tone: "bg-zinc-500/80",
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
          <br />в {COVERAGE.length} странах
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

/* -------------------------------------------------------------------------- */
/* Country carousel                                                            */
/* -------------------------------------------------------------------------- */

function CountryCard({
  active,
  index,
  onGo,
  onPick,
}: {
  active: CountryCoverage;
  index: number;
  onGo: (step: number) => void;
  onPick: (index: number) => void;
}) {
  return (
    <section className="glass-panel p-6" aria-roledescription="карусель" aria-label="Страны каталога">
      <RouteChart active={active} />

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onGo(-1)}
          aria-label="Предыдущая страна"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/[0.12] text-zinc-300 transition-colors hover:border-white/30 hover:text-zinc-50"
        >
          <CaretLeftIcon className="size-4" aria-hidden />
        </button>

        <div className="min-w-0 text-center" aria-live="polite">
          <p className="truncate font-medium text-zinc-100">{active.name}</p>
          <p className="text-xs text-zinc-400">
            <span className="num">{active.count}</span>{" "}
            {plural(active.count, "путь", "пути", "путей")}
            {active.km > 0 && (
              <>
                {", "}
                <span className="num">{spaced(active.km)}</span> км от Алматы
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onGo(1)}
          aria-label="Следующая страна"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/[0.12] text-zinc-300 transition-colors hover:border-white/30 hover:text-zinc-50"
        >
          <CaretRightIcon className="size-4" aria-hidden />
        </button>
      </div>

      {/* Университеты названы: в этом и весь смысл экрана. */}
      <ul className="mt-4 space-y-1 border-t border-white/[0.07] pt-4 text-sm leading-snug text-zinc-400">
        {active.orgs.slice(0, 4).map((org) => (
          <li key={org} className="truncate">
            {org}
          </li>
        ))}
        {active.orgs.length > 4 && (
          <li className="text-zinc-500">
            и ещё {active.orgs.length - 4}{" "}
            {plural(active.orgs.length - 4, "университет", "университета", "университетов")}
          </li>
        )}
      </ul>

      {/* Зона нажатия 32×32 у каждой точки, хотя сама точка маленькая:
          девятнадцать целей шириной в палец — это две опрятные строки, а
          шириной в 16px — промах на телефоне. */}
      <div className="mt-4 flex flex-wrap justify-center">
        {COVERAGE.map((country, position) => (
          <button
            key={country.code}
            type="button"
            onClick={() => onPick(position)}
            aria-label={country.name}
            aria-current={position === index ? "true" : undefined}
            className="group grid size-8 place-items-center"
          >
            <span
              className={
                position === index
                  ? "block h-1.5 w-4 rounded-full bg-emerald-400 transition-all"
                  : "block size-1.5 rounded-full bg-white/25 transition-all group-hover:bg-white/50"
              }
            />
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * Every country in the catalogue, plotted from Almaty.
 *
 * Bearing is the real compass bearing and the radius is the real great-circle
 * distance, so the picture is geography rather than decoration: Turkey sits
 * close and west, Japan far and east, and the rings say what "far" costs in
 * kilometres. A world map with landmasses would have been prettier and would
 * have told the applicant nothing they need — how far, and in which direction,
 * is the question a family in Almaty actually argues about.
 */
function RouteChart({ active }: { active: CountryCoverage }) {
  const size = 320;
  const centre = size / 2;
  const maxR = centre - 26;

  // Корень сжимает дальние страны: иначе Европа слипается в одну точку, а
  // половина круга остаётся пустой.
  const radiusFor = (km: number) => (FURTHEST === 0 ? 0 : maxR * Math.sqrt(km / FURTHEST));

  const points = COVERAGE.map((country) => {
    const r = radiusFor(country.km);
    const angle = (country.bearing - 90) * RAD;
    return {
      ...country,
      x: fixed(centre + r * Math.cos(angle)),
      y: fixed(centre + r * Math.sin(angle)),
    };
  });

  const activePoint = points.find((point) => point.code === active.code);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full"
        role="img"
        aria-label={`${COVERAGE.length} стран каталога, отложенных от Алматы по направлению и расстоянию`}
      >
        {/* Кольца расстояния. */}
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <circle
            key={fraction}
            cx={centre}
            cy={centre}
            r={fixed(maxR * Math.sqrt(fraction))}
            fill="none"
            stroke="rgb(255 255 255 / 0.07)"
          />
        ))}
        {/* Стороны света. */}
        {[0, 90, 180, 270].map((degrees) => {
          const angle = (degrees - 90) * RAD;
          return (
            <line
              key={degrees}
              x1={centre}
              y1={centre}
              x2={fixed(centre + maxR * Math.cos(angle))}
              y2={fixed(centre + maxR * Math.sin(angle))}
              stroke="rgb(255 255 255 / 0.05)"
            />
          );
        })}

        {/* Луч к выбранной стране. */}
        {activePoint && (
          <line
            x1={centre}
            y1={centre}
            x2={activePoint.x}
            y2={activePoint.y}
            stroke="rgb(52 211 153 / 0.5)"
            strokeWidth="1"
          />
        )}

        {points.map((point) => {
          const current = point.code === active.code;
          return (
            <circle
              key={point.code}
              cx={point.x}
              cy={point.y}
              r={current ? 5 : fixed(2.5 + Math.min(3, (point.count / BIGGEST) * 3))}
              fill={current ? "rgb(52 211 153)" : "rgb(255 255 255 / 0.32)"}
            />
          );
        })}

        {/* Алматы: точка отсчёта. */}
        <circle cx={centre} cy={centre} r="3" fill="rgb(255 255 255 / 0.85)" />

        {activePoint && (
          <text
            x={activePoint.x}
            y={activePoint.y - 12}
            textAnchor="middle"
            className="fill-zinc-100 text-[11px]"
          >
            {activePoint.name}
          </text>
        )}
      </svg>

      <p className="mt-1 text-center text-[11px] text-zinc-500">
        от Алматы, кольца — {Math.round(FURTHEST / 4 / 100) / 10} тыс. км
      </p>
    </div>
  );
}

/**
 * Разряды пробелом, вручную.
 *
 * `toLocaleString("ru-RU")` разделяет тысячи по-разному в Node и в браузере
 * (неразрывный пробел против узкого неразрывного), и на странице, которая
 * рендерится на сервере, это ровно то расхождение гидратации, о котором React
 * предупреждает первым пунктом. Одна функция надёжнее одной строки.
 */
function spaced(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Русское склонение после числительного. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
