"use client";

import { useMemo, useState } from "react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";

import { PROGRAMS } from "@/data/catalog";
import { CAMPUSES } from "@/data/campuses";
import { countryName } from "@/data/countries";
import { COUNTRY_SHAPES, MAP_HEIGHT, MAP_WIDTH, project } from "@/data/world-map.generated";
import { UniversityCrest, crestInitials } from "@/components/university-crest";
import { formatDateRu } from "@/lib/date";
import type { Program } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The catalogue on a real map.
 *
 * What stood here before was a polar plot: bearing and distance from Almaty,
 * drawn on rings. It was defensible — how far and in which direction is a real
 * question for a family paying for a flight — and it was also the wrong picture
 * for the sentence beside it. The claim is "these are named universities in
 * named places", and a diagram of angles cannot carry it. Coastlines can.
 *
 * So this is the actual world: Natural Earth's 1:110m outlines, baked into path
 * data by `scripts/build-world-map.mjs`, with one pin per city at the campus's
 * real coordinates. Nothing is arranged by eye, and nothing is a stock tile
 * either — there is no map server involved, no key, no request, and the section
 * renders identically on the server and in a browser with the network off.
 *
 * ── Cities, not universities ───────────────────────────────────────────────
 *
 * Seventy-five pins would be a smear over Almaty and London. Fifty cities is a
 * map. So the pin is the city, its size is how many paths start there, and the
 * plaque names every university behind it — which is the promise the heading
 * makes, kept at the resolution a person can actually read.
 */

/* -------------------------------------------------------------------------- */
/* Frames                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The proportions frames are padded to.
 *
 * A world holding this catalogue is a wide band — the universities run from
 * 1°N to 60°N and from California to Japan — so a squarer frame buys nothing
 * but empty ocean. The panel is narrower than this on a phone, and the SVG is
 * fitted rather than cropped there: on a black panel the leftover space above
 * and below reads as more sky, which is the one case where letterboxing costs
 * nothing.
 */
const FRAME_RATIO = 2.4;

interface Region {
  key: string;
  label: string;
  /** Degrees: west, south, east, north. */
  bounds: readonly [number, number, number, number];
}

const REGIONS: readonly Region[] = [
  { key: "world", label: "Весь мир", bounds: [-168, -52, 176, 76] },
  { key: "kz", label: "Казахстан", bounds: [50, 40, 84, 55] },
  { key: "eu", label: "Европа", bounds: [-11, 40, 31, 61] },
  { key: "asia", label: "Азия", bounds: [66, 1, 145, 44] },
  { key: "am", label: "Америка", bounds: [-126, 32, -62, 51] },
];

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A lon/lat box as a viewBox, widened or heightened to the panel's proportions.
 *
 * Letterboxing is what happens otherwise, and a map with black bars above it
 * looks like a video. Growing the short side instead keeps the frame filled and
 * only ever shows *more* map than was asked for, which is never wrong.
 */
function frameOf(bounds: readonly [number, number, number, number]): Frame {
  const [west, south, east, north] = bounds;
  const topLeft = project(west, north);
  const bottomRight = project(east, south);

  let w = bottomRight.x - topLeft.x;
  let h = bottomRight.y - topLeft.y;
  let x = topLeft.x;
  let y = topLeft.y;

  if (w / h < FRAME_RATIO) {
    const widened = h * FRAME_RATIO;
    x -= (widened - w) / 2;
    w = widened;
  } else {
    const heightened = w / FRAME_RATIO;
    y -= (heightened - h) / 2;
    h = heightened;
  }

  return { x: round(x), y: round(y), w: round(w), h: round(h) };
}

const round = (value: number): number => Math.round(value * 100) / 100;

/* -------------------------------------------------------------------------- */
/* Pins                                                                        */
/* -------------------------------------------------------------------------- */

interface Pin {
  key: string;
  city: string;
  country: string;
  x: number;
  y: number;
  programs: readonly Program[];
}

/**
 * One pin per city, placed at the mean of its campuses.
 *
 * A university with no coordinate is left off the map rather than dropped at
 * the centre of its country — an invented position is the map equivalent of an
 * invented date, and this product does not draw those.
 */
const PINS: readonly Pin[] = (() => {
  const byCity = new Map<string, { city: string; country: string; programs: Program[] }>();

  for (const program of PROGRAMS) {
    if (CAMPUSES[program.id] === undefined) continue;
    const city = program.city ?? countryName(program.country);
    const key = `${city}|${program.country}`;
    const entry = byCity.get(key) ?? { city, country: program.country, programs: [] };
    entry.programs.push(program);
    byCity.set(key, entry);
  }

  return [...byCity.entries()]
    .map(([key, entry]) => {
      const points = entry.programs.map((program) => CAMPUSES[program.id]!);
      const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
      const lon = points.reduce((sum, point) => sum + point.lon, 0) / points.length;
      const { x, y } = project(lon, lat);
      return {
        key,
        city: entry.city,
        country: entry.country,
        x: round(x),
        y: round(y),
        programs: entry.programs,
      };
    })
    // Больше путей — позже в списке, значит поверх соседей: в Алматы десять
    // путей, и эта точка не должна оказаться под точкой с одним.
    .sort((a, b) => a.programs.length - b.programs.length);
})();

const BUSIEST = Math.max(...PINS.map((pin) => pin.programs.length));

/** Countries the catalogue reaches, so the map can tell them from the rest. */
const REACHED = new Set(PROGRAMS.map((program) => program.country));

/** Меридианы и параллели: карта, а не силуэт материков. */
const MERIDIANS = [-120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const PARALLELS = [60, 45, 30, 15, 0, -15, -30];

/** Радиус точки города: от одного пути до десяти. */
function radiusOf(pin: Pin, unit: number): number {
  return unit * (4 + (pin.programs.length / BUSIEST) * 6);
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

interface Placed {
  x: number;
  y: number;
  anchor: "middle" | "start" | "end";
}

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/**
 * Where each city's name goes, given that names are wider than cities.
 *
 * Britain is the case that decides this: Oxford, Cambridge, Coventry, Bristol
 * and four London universities land inside a thumb's width of each other, and
 * a label hung above every dot spells «BristoLondon». So names are placed one
 * at a time, busiest city first — above the dot, else below, else to one side —
 * and a name that fits nowhere is dropped rather than drawn over its
 * neighbour's. Dots are placed as obstacles before any name is, so a label
 * never covers a city it does not belong to.
 *
 * Greedy and deterministic. It runs over a fixed order, so the server and the
 * browser lay the same names out, and nothing here depends on measuring text in
 * a DOM that does not exist yet — the width is estimated from the string, which
 * at this size is off by a few pixels and never by a word.
 */
function placeLabels(
  pins: readonly Pin[],
  frame: Frame,
  activeKey: string,
  unit: number,
): Map<string, Placed> {
  const fontSize = unit * 15;
  const placed = new Map<string, Placed>();
  const taken: Box[] = PINS.map((pin) => {
    const r = radiusOf(pin, unit) * 1.15;
    return { x1: pin.x - r, y1: pin.y - r, x2: pin.x + r, y2: pin.y + r };
  });

  // Ничьи разбиваются сравнением строк по кодовым единицам, а не
  // `localeCompare`: порядок здесь — лишь способ сделать результат
  // воспроизводимым, а правила сортировки в ICU Node и ICU браузера
  // совпадать не обязаны. Достаточно одного расхождения, чтобы подписи
  // встали иначе на сервере и в браузере — а это ровно то несовпадение
  // гидратации, из-за которого React выбрасывает поддерево целиком.
  const ordered = [...pins].sort(
    (a, b) =>
      Number(b.key === activeKey) - Number(a.key === activeKey) ||
      b.programs.length - a.programs.length ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );

  for (const pin of ordered) {
    const r = radiusOf(pin, unit);
    // 0.55em за символ: кириллица и латиница в этом начертании укладываются
    // между 0.5 и 0.6, а промах в полсимвола ничего не решает.
    const w = pin.city.length * fontSize * 0.55;
    const h = fontSize * 1.1;

    const options: Placed[] = [
      { x: pin.x, y: round(pin.y - r - unit * 5), anchor: "middle" },
      { x: pin.x, y: round(pin.y + r + h * 0.9), anchor: "middle" },
      { x: round(pin.x + r + unit * 3), y: round(pin.y + h * 0.3), anchor: "start" },
      { x: round(pin.x - r - unit * 3), y: round(pin.y + h * 0.3), anchor: "end" },
      // Углы — последняя попытка перед тем, как имя не рисовать вовсе. Оксфорд
      // и Кембридж стоят в часе езды от Лондона, и без этих четырёх вариантов
      // именно они пропадали с карты первыми.
      { x: round(pin.x + r + unit * 3), y: round(pin.y - r - unit * 3), anchor: "start" },
      { x: round(pin.x - r - unit * 3), y: round(pin.y - r - unit * 3), anchor: "end" },
      { x: round(pin.x + r + unit * 3), y: round(pin.y + r + h * 0.8), anchor: "start" },
      { x: round(pin.x - r - unit * 3), y: round(pin.y + r + h * 0.8), anchor: "end" },
    ];

    for (const option of options) {
      const x1 =
        option.anchor === "middle"
          ? option.x - w / 2
          : option.anchor === "start"
            ? option.x
            : option.x - w;
      const box: Box = { x1, y1: option.y - h * 0.8, x2: x1 + w, y2: option.y + h * 0.25 };

      const outside =
        box.x1 < frame.x ||
        box.x2 > frame.x + frame.w ||
        box.y1 < frame.y ||
        box.y2 > frame.y + frame.h;
      if (outside || taken.some((other) => overlaps(other, box))) continue;

      taken.push(box);
      placed.set(pin.key, option);
      break;
    }
  }

  return placed;
}

/* -------------------------------------------------------------------------- */
/* Section                                                                     */
/* -------------------------------------------------------------------------- */

export function WorldMap() {
  const [regionKey, setRegionKey] = useState("world");
  const [pinKey, setPinKey] = useState(PINS.find((pin) => pin.city === "Алматы")?.key ?? PINS[0]!.key);
  const [programId, setProgramId] = useState<string | null>(null);

  const region = REGIONS.find((item) => item.key === regionKey) ?? REGIONS[0]!;
  const frame = useMemo(() => frameOf(region.bounds), [region]);
  const pin = PINS.find((item) => item.key === pinKey) ?? PINS[0]!;

  // Единица кадра: всё, что рисуется поверх карты, задано в долях ширины
  // кадра, поэтому точка остаётся одного размера на экране и при увеличении
  // не раздувается в блин.
  const unit = frame.w / 1000;

  // На весь мир подписан только выбранный город: пятьдесят имён на карте
  // размером с ладонь — это не карта, а мелкий шрифт.
  const labels = useMemo(
    () => placeLabels(regionKey === "world" ? [pin] : PINS, frame, pin.key, unit),
    [regionKey, frame, pin, unit],
  );

  const selectPin = (next: Pin) => {
    setPinKey(next.key);
    setProgramId(null);
  };

  /**
   * Переключение региона уводит выбор вместе с кадром.
   *
   * Иначе под картой Европы остаётся плашка Алматы: карта показывает одно,
   * подпись под ней — другое, и человек читает это как поломку. Выбирается
   * самый крупный город внутри новых границ, а если каталог там пуст —
   * выбор остаётся прежним, потому что врать пустой плашкой хуже.
   */
  const selectRegion = (next: Region) => {
    setRegionKey(next.key);
    const [west, south, east, north] = next.bounds;
    const inside = PINS.filter((item) => {
      const topLeft = project(west, north);
      const bottomRight = project(east, south);
      return (
        item.x >= topLeft.x && item.x <= bottomRight.x && item.y >= topLeft.y && item.y <= bottomRight.y
      );
    });
    const busiest = inside.reduce<Pin | null>(
      (best, item) => (best === null || item.programs.length > best.programs.length ? item : best),
      null,
    );
    if (busiest !== null) selectPin(busiest);
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3 sm:px-5">
        {REGIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => selectRegion(item)}
            aria-pressed={item.key === regionKey}
            className={cn(
              "inline-flex min-h-8 items-center rounded-full border px-3 text-xs transition-colors",
              item.key === regionKey
                ? "border-white/70 bg-white/90 text-zinc-950"
                : "border-white/[0.14] text-zinc-400 hover:border-white/35 hover:text-zinc-100",
            )}
          >
            {item.label}
          </button>
        ))}
        <p className="ml-auto hidden text-[11px] text-zinc-500 sm:block">
          Точка — город, размер — сколько путей
        </p>
      </div>

      <div className="relative">
        <svg
          viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="block aspect-[3/2] w-full bg-black/40 sm:aspect-[2] lg:aspect-[2.4]"
          role="img"
          aria-label={`Карта мира: ${PINS.length} городов, в которых есть университеты из каталога`}
        >
          {/* Сетка координат. */}
          <g stroke="rgb(255 255 255 / 0.05)" strokeWidth={unit * 0.8} fill="none">
            {MERIDIANS.map((lon) => {
              const { x } = project(lon, 0);
              return <line key={`m${lon}`} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} />;
            })}
            {PARALLELS.map((lat) => {
              const { y } = project(0, lat);
              return <line key={`p${lat}`} x1={0} y1={y} x2={MAP_WIDTH} y2={y} />;
            })}
          </g>

          {/* Суша. Страны каталога светлее — это и есть охват. */}
          <g strokeWidth={unit * 0.7} strokeLinejoin="round">
            {COUNTRY_SHAPES.map((shape, index) => {
              const reached = shape.code !== null && REACHED.has(shape.code);
              return (
                <path
                  key={shape.code ?? `land-${index}`}
                  d={shape.d}
                  fill={reached ? "rgb(255 255 255 / 0.2)" : "rgb(255 255 255 / 0.06)"}
                  stroke={reached ? "rgb(255 255 255 / 0.42)" : "rgb(255 255 255 / 0.14)"}
                />
              );
            })}
          </g>

          {/* Города. */}
          {PINS.map((item) => {
            const active = item.key === pin.key;
            const r = radiusOf(item, unit);
            const label = labels.get(item.key);
            return (
              <g
                key={item.key}
                role="button"
                tabIndex={0}
                aria-label={`${item.city}, ${countryName(item.country)}: ${item.programs.length}`}
                onClick={() => selectPin(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectPin(item);
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:opacity-100"
              >
                <circle
                  cx={item.x}
                  cy={item.y}
                  r={r * 2.4}
                  fill="rgb(255 255 255 / 0.14)"
                  opacity={active ? 1 : 0}
                />
                <circle
                  cx={item.x}
                  cy={item.y}
                  r={r}
                  fill={active ? "rgb(255 255 255)" : "rgb(255 255 255 / 0.55)"}
                  stroke="rgb(0 0 0 / 0.55)"
                  strokeWidth={unit * 0.8}
                />
                {label !== undefined && (
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor}
                    fill={active ? "rgb(255 255 255)" : "rgb(255 255 255 / 0.66)"}
                    stroke="rgb(0 0 0 / 0.75)"
                    strokeWidth={unit * 2.4}
                    paintOrder="stroke"
                    style={{ fontSize: unit * 15, fontWeight: 500 }}
                  >
                    {item.city}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <p className="pointer-events-none absolute bottom-2 left-4 text-[10px] text-zinc-600">
          Natural Earth 1:110m · координаты кампусов
        </p>
      </div>

      <CityPlaque pin={pin} programId={programId} onPick={setProgramId} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Plaque                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What the pin stands for: the city, and every university in it by name.
 *
 * Picking one opens its picture. That is the whole interaction — the map says
 * where, the plaque says who, and the picture is what makes a row of Cyrillic
 * abbreviations turn into places a seventeen-year-old can tell apart.
 */
function CityPlaque({
  pin,
  programId,
  onPick,
}: {
  pin: Pin;
  programId: string | null;
  onPick: (id: string | null) => void;
}) {
  const selected = pin.programs.find((program) => program.id === programId);

  return (
    <div className="grid gap-5 border-t border-white/[0.07] p-4 sm:p-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div>
        <div className="relative aspect-[8/5] overflow-hidden rounded-xl border border-white/[0.09]">
          <UniversityCrest
            seed={selected?.org ?? pin.city}
            programId={selected?.id}
            label={selected === undefined ? undefined : crestInitials(selected.org)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
            <p className="truncate text-sm font-medium text-zinc-100">
              {selected?.org ?? pin.city}
            </p>
            <p className="truncate text-xs text-zinc-400">
              {pin.city}, {countryName(pin.country)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          {selected === undefined
            ? "Выбери университет из списка — у каждого своё небо."
            : "Это не фотография кампуса, а рисунок: одно и то же имя даёт одно и то же небо."}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-100">
            {pin.city}, {countryName(pin.country)}
          </h3>
          <span className="num shrink-0 text-xs text-zinc-400">
            {pin.programs.length} {plural(pin.programs.length, "путь", "пути", "путей")}
          </span>
        </div>

        <ul className="mt-3 max-h-[19rem] space-y-1 overflow-y-auto pr-1">
          {pin.programs.map((program) => {
            const active = program.id === selected?.id;
            return (
              <li key={program.id}>
                <button
                  type="button"
                  onClick={() => onPick(active ? null : program.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
                    active
                      ? "border-white/30 bg-white/[0.07]"
                      : "border-transparent hover:border-white/[0.12] hover:bg-white/[0.03]",
                  )}
                >
                  <span className="size-9 shrink-0 overflow-hidden rounded-md border border-white/[0.1]">
                    <UniversityCrest seed={program.org} programId={program.id} compact />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-100">{program.org}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {program.application_deadline === undefined
                        ? "вуз не публикует дату подачи"
                        : `подача до ${formatDateRu(program.application_deadline.date)}`}
                    </span>
                  </span>
                  {program.official_url !== undefined && active && (
                    <a
                      href={program.official_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Страница приёмной комиссии: ${program.org}`}
                      className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-100"
                    >
                      <ArrowSquareOutIcon className="size-4" aria-hidden />
                    </a>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
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
