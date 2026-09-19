import { describe, expect, it } from "vitest";

import { CAMPUSES, campusOf } from "@/data/campuses";
import { PROGRAMS } from "@/data/catalog";
import { COUNTRY_SHAPES, MAP_HEIGHT, MAP_WIDTH, project } from "@/data/world-map.generated";
import { crestInitials } from "@/components/university-crest";

/**
 * The map's own audit.
 *
 * `data/campuses.ts` is the one table in the product written entirely by hand
 * and carrying no provenance, which makes it exactly the table most likely to
 * quietly rot: a university added to the catalogue with no coordinate simply
 * vanishes from the landing, and nothing anywhere else would notice. So the
 * rules it promises in its own header are checked here rather than trusted.
 *
 * What these tests deliberately do NOT check: that a coordinate is *correct*.
 * Nobody here can assert from a unit test that Imperial College is at
 * 51.499°N — the checks below catch the failures a test can actually catch, a
 * missing entry, a swapped sign, a campus that drifted off its own city, and
 * say nothing about the rest.
 */

const EARTH_KM = 6371;
const RAD = Math.PI / 180;

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

describe("campuses", () => {
  it("covers every programme, and nothing else", () => {
    for (const program of PROGRAMS) {
      expect(campusOf(program.id), `${program.id}: нет координаты`).toBeDefined();
    }

    const programIds = new Set(PROGRAMS.map((program) => program.id));
    for (const id of Object.keys(CAMPUSES)) {
      expect(programIds.has(id), `${id}: координата без программы`).toBe(true);
    }
  });

  it("holds real coordinates", () => {
    for (const [id, campus] of Object.entries(CAMPUSES)) {
      expect(Number.isFinite(campus.lat), `${id}: lat`).toBe(true);
      expect(Number.isFinite(campus.lon), `${id}: lon`).toBe(true);
      expect(Math.abs(campus.lat), `${id}: lat вне диапазона`).toBeLessThanOrEqual(90);
      expect(Math.abs(campus.lon), `${id}: lon вне диапазона`).toBeLessThanOrEqual(180);
    }
  });

  /**
   * The check that catches a typed sign or a transposed pair: everything in one
   * city has to be in that city. Sixty kilometres is generous — it covers UBC
   * sitting at the far end of Vancouver and NTU at the far end of Singapore —
   * and still an order of magnitude tighter than the mistakes it is for.
   */
  it("keeps every university inside the city it is listed in", () => {
    const byCity = new Map<string, { id: string; lat: number; lon: number }[]>();

    for (const program of PROGRAMS) {
      const campus = campusOf(program.id);
      if (campus === undefined || program.city === undefined) continue;
      const key = `${program.city}|${program.country}`;
      const group = byCity.get(key) ?? [];
      group.push({ id: program.id, ...campus });
      byCity.set(key, group);
    }

    for (const [city, group] of byCity) {
      for (const one of group) {
        for (const other of group) {
          expect(distanceKm(one, other), `${city}: ${one.id} ↔ ${other.id}`).toBeLessThan(60);
        }
      }
    }
  });
});

describe("the world map", () => {
  it("projects onto the canvas its own paths were drawn on", () => {
    expect(project(-180, 90)).toEqual({ x: 0, y: 0 });
    expect(project(180, -90)).toEqual({ x: MAP_WIDTH, y: MAP_HEIGHT });
    expect(project(0, 0)).toEqual({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  });

  it("places every campus inside the canvas", () => {
    for (const [id, campus] of Object.entries(CAMPUSES)) {
      const { x, y } = project(campus.lon, campus.lat);
      expect(x, `${id}: x`).toBeGreaterThanOrEqual(0);
      expect(x, `${id}: x`).toBeLessThanOrEqual(MAP_WIDTH);
      expect(y, `${id}: y`).toBeGreaterThanOrEqual(0);
      expect(y, `${id}: y`).toBeLessThanOrEqual(MAP_HEIGHT);
    }
  });

  it("carries drawable geometry for every country it ships", () => {
    expect(COUNTRY_SHAPES.length).toBeGreaterThan(100);

    for (const shape of COUNTRY_SHAPES) {
      expect(shape.d.startsWith("M"), `${shape.name}: путь`).toBe(true);
      expect(shape.d.endsWith("Z"), `${shape.name}: путь не замкнут`).toBe(true);
      expect(shape.name.length, "имя страны").toBeGreaterThan(0);
    }

    const codes = COUNTRY_SHAPES.map((shape) => shape.code).filter(
      (code): code is string => code !== null,
    );
    expect(new Set(codes).size, "страна нарисована дважды").toBe(codes.length);
  });

  /**
   * Hong Kong and Singapore are the documented exceptions: at 1:110m neither is
   * its own polygon, so their universities appear as pins over geometry that
   * belongs to somebody else. If that ever stops being true the generator's
   * comment is wrong, and so is this test.
   */
  it("can tint every catalogue country except the two city states", () => {
    const drawn = new Set(COUNTRY_SHAPES.map((shape) => shape.code));
    const missing = [...new Set(PROGRAMS.map((program) => program.country))]
      .filter((code) => !drawn.has(code))
      .sort();

    expect(missing).toEqual(["HK", "SG"]);
  });
});

describe("university crests", () => {
  it("abbreviates a name to something a person would recognise", () => {
    expect(crestInitials("Massachusetts Institute of Technology")).toBe("MIT");
    expect(crestInitials("University College London")).toBe("UCL");
    expect(crestInitials("Satbayev University (КазНИТУ)")).toBe("SU");
    expect(crestInitials("Казахский национальный университет им. аль-Фараби")).toBe("КНУ");
  });

  it("gives every programme in the catalogue a non-empty mark", () => {
    for (const program of PROGRAMS) {
      expect(crestInitials(program.org).length, program.id).toBeGreaterThan(0);
    }
  });
});
