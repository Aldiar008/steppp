/**
 * Turns real country borders + real campus coordinates into the SVG paths and
 * pin positions the coverage map draws.
 *
 *   node scripts/build-geo.mjs
 *   data/raw/universities_verified.json + data/raw/university-coordinates.json
 *     + world-atlas (Natural Earth, 50m)  →  data/geo.generated.ts
 *
 * Why this runs at build time rather than in the browser: `world-atlas`,
 * `topojson-client` and `d3-geo` together are a few hundred KB neither the
 * client bundle nor the server needs at request time — the shapes are fixed,
 * so they are projected once here and the result is committed as plain
 * numbers, the same "generate, then ship the output" split as
 * import-universities.mjs. It also sidesteps a real hydration hazard: Node
 * and the browser can round the last bit of a `sin`/`cos`/`atan2` result
 * differently, and React refuses to patch an SVG subtree whose server and
 * client attributes disagree. Numbers baked in at generation time are
 * character-for-character identical everywhere.
 *
 * Each country's projection is fit to its own coastline, not to one shared
 * world projection, because the product only ever shows one country at a
 * time (data/countries.ts DESTINATIONS) — a Mercator fit fills the frame with
 * exactly the territory that has a pin on it, which is why Kazakhstan reads
 * as a country here and not a sliver at the edge of a world map.
 *
 * A handful of countries carry territory an admissions map has no use for —
 * Alaska and Hawaii for the US, French Guiana and Réunion for France, the
 * Caribbean Netherlands for the Netherlands — geographically real but far
 * enough from every campus in the catalogue that fitting the projection to
 * them would shrink the country everyone actually applies to down to a
 * sliver. RING_RULES keeps the shape honest (Sicily and Sardinia stay for
 * Italy, Northern Ireland stays for the UK, Hokkaido stays for Japan) while
 * dropping territory the catalogue has no pin anywhere near.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { geoMercator, geoPath, geoBounds } from "d3-geo";
import { feature } from "topojson-client";

const RAW_UNIS = path.resolve("data/raw/universities_verified.json");
const RAW_COORDS = path.resolve("data/raw/university-coordinates.json");
const WORLD_ATLAS = path.resolve("node_modules/world-atlas/countries-50m.json");
const OUT = path.resolve("data/geo.generated.ts");

const universities = JSON.parse(readFileSync(RAW_UNIS, "utf8")).universities;
const coords = JSON.parse(readFileSync(RAW_COORDS, "utf8"));
const world = JSON.parse(readFileSync(WORLD_ATLAS, "utf8"));
const countryGeoms = world.objects.countries.geometries;

/** ISO 3166-1 alpha-2 (as used in data/countries.ts) → numeric id (as used in world-atlas). */
const NUMERIC_ID = {
  US: "840", GB: "826", CH: "756", SG: "702", DE: "276", NL: "528", SE: "752",
  FR: "250", IT: "380", AT: "040", CZ: "203", HU: "348", PL: "616", HK: "344",
  JP: "392", KR: "410", TR: "792", CA: "124", KZ: "398",
};

/**
 * Which of a country's disconnected rings to keep, decided by hand against
 * `node -e` output printing each ring's area and bounding box (areas are in
 * squared degrees — a planar shoelace over lon/lat, good enough to rank rings
 * by size, not to measure anything). Absent here means "keep every ring",
 * right for a country whose rings are already just its recognisable shape
 * (Switzerland, Austria, the Czech Republic, Hungary, Poland, Hong Kong's
 * three harbour pieces).
 */
const RING_RULES = {
  US: { clipLon: [-125, -66], clipLat: [24, 50] }, // contiguous 48; Alaska and Hawaii carry no program
  NL: { clipLon: [-5, 10], clipLat: [50, 54] }, // mainland + Wadden isles; drops the Caribbean municipalities
  FR: { clipLon: [-6, 10], clipLat: [41, 52] }, // mainland + Corsica; drops French Guiana, Réunion, the Antilles
  CA: { maxRings: 6 }, // mainland + the largest Arctic archipelago islands
  GB: { minArea: 0.1 }, // Great Britain + Northern Ireland + the main island groups
  SE: { minArea: 0.1 }, // mainland + Gotland + Öland
  IT: { minArea: 0.5 }, // mainland + Sicily + Sardinia
  JP: { minArea: 1.0 }, // Honshu + Hokkaido + Kyushu + Shikoku
  KR: { minArea: 0.1 }, // mainland + Jeju
  TR: { minArea: 0.05 }, // Anatolia + the European (Thrace) side of the Bosphorus, where two campuses sit
  KZ: { minArea: 0.5 }, // mainland; drops three Caspian-shore specks
  DE: { minArea: 1.0 }, // mainland; the Baltic/North Sea islands are not load-bearing for recognisability
};

function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function ringBBox(ring) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** A country's kept rings as one Polygon/MultiPolygon geometry, filtered by RING_RULES. */
function keptGeometry(code, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const rule = RING_RULES[code];

  let infos = polygons.map((rings) => ({ rings, area: ringArea(rings[0]), bbox: ringBBox(rings[0]) }));
  infos.sort((a, b) => b.area - a.area);

  let kept = infos;
  if (rule?.clipLon || rule?.clipLat) {
    kept = infos.filter(({ bbox }) => {
      const cx = (bbox[0] + bbox[2]) / 2;
      const cy = (bbox[1] + bbox[3]) / 2;
      const inLon = !rule.clipLon || (cx >= rule.clipLon[0] && cx <= rule.clipLon[1]);
      const inLat = !rule.clipLat || (cy >= rule.clipLat[0] && cy <= rule.clipLat[1]);
      return inLon && inLat;
    });
  } else if (rule?.minArea !== undefined) {
    kept = infos.filter((info) => info.area >= rule.minArea);
  } else if (rule?.maxRings !== undefined) {
    kept = infos.slice(0, rule.maxRings);
  }
  if (kept.length === 0) kept = infos.slice(0, 1); // never end up with an empty country

  return { type: "MultiPolygon", coordinates: kept.map((info) => info.rings) };
}

/* -------------------------------------------------------------------------- */
/* Per-country universities                                                    */
/* -------------------------------------------------------------------------- */

const byCountry = new Map();
for (const uni of universities) {
  const place = coords[uni.id];
  if (!place) throw new Error(`no coordinates for ${uni.id} — add it to data/raw/university-coordinates.json`);
  const list = byCountry.get(uni.country) ?? [];
  list.push({ id: uni.id, name: uni.name, domain: place.domain, lat: place.lat, lon: place.lon });
  byCountry.set(uni.country, list);
}

function fixed(n) {
  return Math.round(n * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* Project each country                                                        */
/* -------------------------------------------------------------------------- */

const PAD = 34;
const TARGET_AREA = 680 * 560;

const countries = {};

for (const [code, unis] of byCountry) {
  const numericId = NUMERIC_ID[code];
  if (!numericId) throw new Error(`no world-atlas id mapped for ${code} in scripts/build-geo.mjs`);
  const topoGeom = countryGeoms.find((g) => g.id === numericId);
  if (!topoGeom) throw new Error(`world-atlas has no country ${code} (${numericId})`);

  const rawGeometry = feature(world, topoGeom).geometry;
  const geometry = keptGeometry(code, rawGeometry);
  const geoFeature = { type: "Feature", properties: {}, geometry };

  const [[lonMin, latMin], [lonMax, latMax]] = geoBounds(geoFeature);
  const midLatRad = ((latMin + latMax) / 2) * (Math.PI / 180);
  const aspect = Math.max(
    0.35,
    Math.min(2.8, ((lonMax - lonMin) * Math.cos(midLatRad)) / (latMax - latMin || 1)),
  );
  const width = Math.round(Math.sqrt(TARGET_AREA * aspect));
  const height = Math.round(Math.sqrt(TARGET_AREA / aspect));

  const projection = geoMercator().fitExtent(
    [
      [PAD, PAD],
      [width - PAD, height - PAD],
    ],
    geoFeature,
  );
  // One decimal place is well past what a screen can show and keeps the
  // generated file from carrying d3's default sub-pixel precision for nothing.
  const drawPath = geoPath(projection).digits(1);

  const points = unis
    .map((uni) => {
      const projected = projection([uni.lon, uni.lat]);
      if (!projected) return null;
      return { id: uni.id, name: uni.name, domain: uni.domain, x: fixed(projected[0]), y: fixed(projected[1]) };
    })
    .filter((p) => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  countries[code] = {
    width,
    height,
    path: drawPath(geoFeature) ?? "",
    points,
  };
}

/* -------------------------------------------------------------------------- */
/* Emit                                                                        */
/* -------------------------------------------------------------------------- */

const header = `/**
 * GENERATED — do not edit by hand.
 *
 *   node scripts/build-geo.mjs
 *
 * Source: data/raw/university-coordinates.json (campus coordinates + primary
 * domain, hand-compiled) projected onto world-atlas/countries-50m.json
 * (Natural Earth borders) by scripts/build-geo.mjs, which also documents
 * which disconnected pieces of each country's coastline it kept.
 *
 * \`path\` is an SVG path \`d\` for the country's own silhouette; \`points\` are
 * each university's real campus location projected into the same
 * \`0 0 width height\` coordinate space, so a pin drawn at (x, y) sits where
 * that campus actually is relative to the coastline.
 */
export interface GeoPoint {
  id: string;
  name: string;
  domain: string;
  x: number;
  y: number;
}

export interface CountryGeo {
  width: number;
  height: number;
  path: string;
  points: readonly GeoPoint[];
}

export const COUNTRY_GEO: Readonly<Record<string, CountryGeo>> = ${JSON.stringify(countries, null, 2)};

/** Every catalogue university's primary domain, by program id — the same real favicon this file draws on the map, for anywhere else in the product that wants one (e.g. the door cards). */
export const DOMAIN_BY_ID: Readonly<Record<string, string>> = ${JSON.stringify(
    Object.fromEntries(universities.map((uni) => [uni.id, coords[uni.id].domain])),
    null,
    2,
  )};
`;

writeFileSync(OUT, header, "utf8");

console.log(`countries: ${Object.keys(countries).length}`);
for (const [code, geo] of Object.entries(countries)) {
  console.log(`  ${code}: ${geo.points.length} universities, ${geo.width}×${geo.height}`);
}
