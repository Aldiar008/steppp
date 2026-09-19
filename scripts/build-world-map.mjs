/**
 * Turns Natural Earth's country outlines into SVG paths the landing can draw.
 *
 *   node scripts/build-world-map.mjs
 *   data/raw/countries-110m.json  →  data/world-map.generated.ts
 *
 * The map on the landing page is a real map: the coastlines below are the ones
 * Natural Earth publishes, not a decorative blob. Baking them into path strings
 * at build time rather than shipping a mapping library is the whole point —
 * the section renders on the server, needs no tile requests, no API key and no
 * runtime dependency, and it cannot fail to load while a visitor is looking at
 * it.
 *
 * ── Why equirectangular ────────────────────────────────────────────────────
 *
 * The projection has to be applied twice: here, to the coastlines, and in the
 * browser, to every university's coordinates. If the two disagree by so much as
 * a rounding rule, markers drift into the sea. Equirectangular is the one
 * projection whose formula is two multiplications, so both copies are provably
 * the same:
 *
 *   x = (lon + 180) / 360 * WIDTH
 *   y = ( 90 - lat) / 180 * HEIGHT
 *
 * It stretches the far north, which a prettier projection would not, and that
 * is an accepted cost: the catalogue sits between 1°N and 60°N, and the section
 * frames regions by cropping the viewBox, where distortion matters least.
 *
 * ── What gets dropped, and why that is honest ──────────────────────────────
 *
 * Antarctica, and every island smaller than a pixel at the drawn size. Neither
 * carries a university, both cost bytes on a page a visitor is waiting for, and
 * an island that renders as a sub-pixel speck is noise rather than information.
 * Nothing that holds a marker is ever simplified away: the filter runs on
 * geometry, and the markers are drawn from their own coordinates.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAW = path.resolve("data/raw/countries-110m.json");
const OUT = path.resolve("data/world-map.generated.ts");

/** Projected canvas. 2:1 is what the whole-globe equirectangular frame is. */
const WIDTH = 2000;
const HEIGHT = 1000;

/** Rings whose projected area is under this are islands nobody can see. */
const MIN_RING_AREA = 2.5;
/** Points closer together than this collapse into one. */
const MIN_STEP = 2;
/** Ice, no universities, and a sixth of the file. */
const SKIP_IDS = new Set(["010"]);

/**
 * ISO 3166-1 numeric → alpha-2, for the countries the catalogue reaches.
 *
 * Only these are needed: a country the catalogue does not reach is still drawn,
 * it just does not need to be identifiable. Hong Kong and Singapore are absent
 * on purpose — at this resolution neither exists as its own polygon, and the
 * product says so by placing their universities as markers rather than
 * pretending to tint a landmass that is not there.
 */
const ALPHA2 = {
  "040": "AT",
  124: "CA",
  156: "CN",
  203: "CZ",
  250: "FR",
  276: "DE",
  348: "HU",
  380: "IT",
  392: "JP",
  398: "KZ",
  410: "KR",
  528: "NL",
  616: "PL",
  752: "SE",
  756: "CH",
  784: "AE",
  792: "TR",
  826: "GB",
  840: "US",
};

/* -------------------------------------------------------------------------- */
/* TopoJSON                                                                    */
/* -------------------------------------------------------------------------- */

const topology = JSON.parse(readFileSync(RAW, "utf8"));
const { scale, translate } = topology.transform;

/**
 * One arc, delta-decoded and projected.
 *
 * TopoJSON stores every arc as a starting point followed by quantised deltas,
 * which is what makes the file small. Undoing that is the only decoding this
 * script does; there is no library involved because there is nothing else to
 * decode.
 */
const ARCS = topology.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    const lon = x * scale[0] + translate[0];
    const lat = y * scale[1] + translate[1];
    return [((lon + 180) / 360) * WIDTH, ((90 - lat) / 180) * HEIGHT];
  });
});

/** Arc `index`, forwards; a negative index means arc `~index` backwards. */
function arcPoints(index) {
  if (index >= 0) return ARCS[index];
  return [...ARCS[~index]].reverse();
}

/** A ring is a chain of arcs; consecutive arcs share their joining point. */
function ringPoints(ring) {
  const points = [];
  for (const index of ring) {
    const segment = arcPoints(index);
    for (let i = points.length === 0 ? 0 : 1; i < segment.length; i += 1) {
      points.push(segment[i]);
    }
  }
  return points;
}

/* -------------------------------------------------------------------------- */
/* Simplification                                                              */
/* -------------------------------------------------------------------------- */

/** Shoelace area, unsigned. Used only to decide whether a ring is visible. */
function ringArea(points) {
  let total = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    total += points[j][0] * points[i][1] - points[i][0] * points[j][1];
  }
  return Math.abs(total) / 2;
}

/**
 * Drop points that land on top of their neighbour once drawn.
 *
 * Deliberately not Douglas–Peucker: at this resolution the vertices are already
 * a generalisation, and the only real waste is the runs of near-duplicate
 * points the quantisation leaves behind. The last point is always kept so the
 * ring still closes where it started.
 */
function thin(points) {
  const kept = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = kept[kept.length - 1];
    const dx = points[i][0] - previous[0];
    const dy = points[i][1] - previous[1];
    if (dx * dx + dy * dy >= MIN_STEP * MIN_STEP) kept.push(points[i]);
  }
  if (points.length > 1) kept.push(points[points.length - 1]);
  return kept;
}

const round = (value) => Math.round(value);

/** One ring as an SVG subpath, or "" when it is too small to be worth drawing. */
function subpath(ring) {
  const points = ringPoints(ring);
  if (points.length < 4 || ringArea(points) < MIN_RING_AREA) return "";

  const thinned = thin(points);
  if (thinned.length < 4) return "";

  let d = `M${round(thinned[0][0])} ${round(thinned[0][1])}`;
  for (let i = 1; i < thinned.length; i += 1) {
    d += `L${round(thinned[i][0])} ${round(thinned[i][1])}`;
  }
  return `${d}Z`;
}

/* -------------------------------------------------------------------------- */
/* Countries                                                                   */
/* -------------------------------------------------------------------------- */

const shapes = [];

for (const geometry of topology.objects.countries.geometries) {
  if (SKIP_IDS.has(String(geometry.id))) continue;

  const polygons =
    geometry.type === "Polygon"
      ? [geometry.arcs]
      : geometry.type === "MultiPolygon"
        ? geometry.arcs
        : [];

  const d = polygons
    .flatMap((polygon) => polygon.map(subpath))
    .filter((part) => part !== "")
    .join("");

  if (d === "") continue;

  shapes.push({
    code: ALPHA2[String(geometry.id)] ?? ALPHA2[Number(geometry.id)] ?? null,
    name: geometry.properties?.name ?? "",
    d,
  });
}

// Catalogue countries last, so their brighter fill paints over the neighbours
// they share a border with instead of being overdrawn by them.
shapes.sort((a, b) => Number(a.code !== null) - Number(b.code !== null));

/* -------------------------------------------------------------------------- */
/* Output                                                                      */
/* -------------------------------------------------------------------------- */

const bytes = shapes.reduce((total, shape) => total + shape.d.length, 0);

const file = `/**
 * GENERATED — do not edit by hand.
 *
 *   node scripts/build-world-map.mjs
 *
 * Coastlines: Natural Earth 1:110m, via the \`world-atlas\` TopoJSON kept at
 * data/raw/countries-110m.json (public domain; see countries-110m.LICENSE).
 * Projected equirectangular onto a ${WIDTH}×${HEIGHT} canvas, thinned to
 * ${MIN_STEP}px steps and stripped of Antarctica and of islands under
 * ${MIN_RING_AREA} square units — ${shapes.length} countries, ${bytes} bytes of path data.
 *
 * \`code\` is the ISO 3166-1 alpha-2 of the countries the catalogue reaches, and
 * \`null\` for every other country, which is drawn but not named.
 */

/** The projected canvas these paths are drawn on. */
export const MAP_WIDTH = ${WIDTH};
export const MAP_HEIGHT = ${HEIGHT};

export interface CountryShape {
  code: string | null;
  name: string;
  d: string;
}

/**
 * Longitude/latitude to a point on the canvas above.
 *
 * The same two lines the generator applied to the coastlines, so a marker and
 * the coast it stands on cannot disagree.
 */
export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

export const COUNTRY_SHAPES: readonly CountryShape[] = [
${shapes.map((shape) => `  { code: ${shape.code === null ? "null" : `"${shape.code}"`}, name: ${JSON.stringify(shape.name)}, d: "${shape.d}" },`).join("\n")}
];
`;

writeFileSync(OUT, file);
console.log(`${shapes.length} countries, ${Math.round(bytes / 1024)} KB of path data → ${OUT}`);
