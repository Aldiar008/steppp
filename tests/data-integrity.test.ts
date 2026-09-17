import { describe, expect, it } from "vitest";

import { APP_CATALOG, CATALOG } from "@/data/catalog";
import { LEVERAGE_CANDIDATES } from "@/data/leverage-candidates";
import { QUESTION_CATALOG } from "@/data/questions";
import { SOURCES, findSource } from "@/data/sources";
import { countryName } from "@/data/countries";
import { specialtyLabel } from "@/data/specialties";
import { computeRoute, isIsoDate } from "@/lib/engine";
import { DEMO_PROFILE } from "@/data/demo-profile";
import { todayIso } from "@/lib/date";

/**
 * The catalogue audit, as a test rather than a promise.
 *
 * Every date an applicant sees traces back to a record in here, so the shape of
 * these records is not a style question. The rules below are the ones the rest
 * of the product assumes: ids are unique, dates are real calendar dates, every
 * fact names a source that exists, and nothing claims to be verified when
 * nobody has verified it.
 */

const TODAY = todayIso();

describe("programmes", () => {
  it("are complete and internally consistent", () => {
    expect(APP_CATALOG.programs.length).toBeGreaterThan(0);

    for (const program of APP_CATALOG.programs) {
      expect(program.id, "id").toMatch(/^[a-z0-9-]+$/);
      expect(program.name.length, `${program.id}: name`).toBeGreaterThan(0);
      expect(program.org.length, `${program.id}: org`).toBeGreaterThan(0);
      expect(program.country, `${program.id}: country`).toMatch(/^[A-Z]{2}$/);
      expect(program.fields.length, `${program.id}: fields`).toBeGreaterThan(0);
      expect(program.language.length, `${program.id}: language`).toBeGreaterThan(0);
      // Funding may legitimately be empty: most universities outside Kazakhstan
      // publish nothing about it, and the engine treats that as unknown rather
      // than as "no funding exists".
      expect(program.action_chain.length, `${program.id}: action_chain`).toBeGreaterThan(0);

      // A deadline is optional — some universities publish none — but when it
      // is there it is a real day with a source.
      const deadline = program.application_deadline;
      if (deadline !== undefined) {
        expect(isIsoDate(deadline.date), `${program.id}: deadline`).toBe(true);
        expect(isIsoDate(deadline.checked_at), `${program.id}: checked_at`).toBe(true);
        expect(findSource(deadline.source_id), `${program.id}: source`).toBeDefined();
      }

      // Same for the price: absent is allowed, invented is not.
      const tuition = program.tuition_per_year;
      if (tuition !== undefined) {
        expect(findSource(tuition.source_id), `${program.id}: tuition source`).toBeDefined();
        expect(Number.isFinite(tuition.amount)).toBe(true);
        expect(["KZT", "USD", "EUR"]).toContain(tuition.currency);
      }

      for (const requirement of program.requirements) {
        expect(requirement.id.length, `${program.id}: requirement id`).toBeGreaterThan(0);
        expect(requirement.label.length, `${program.id}: requirement label`).toBeGreaterThan(0);
      }

      // Every step the chain names exists in the action catalogue.
      for (const actionId of program.action_chain) {
        expect(
          APP_CATALOG.actions.some((action) => action.id === actionId),
          `${program.id}: unknown action ${actionId}`,
        ).toBe(true);
      }
    }
  });

  it("have unique ids", () => {
    const ids = APP_CATALOG.programs.map((program) => program.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("name every country they are in, in Russian", () => {
    for (const program of APP_CATALOG.programs) {
      // A bare "JP" on a card is a database talking. The fallback is visible
      // and fixable, but the shipped catalogue should never need it.
      expect(countryName(program.country), program.id).not.toBe(program.country);
    }
  });

  it("label every field they claim", () => {
    for (const program of APP_CATALOG.programs) {
      for (const field of program.fields) {
        // A token nobody translated falls back to itself, which is visible and
        // fixable — but the shipped catalogue should not need the fallback.
        expect(specialtyLabel(field), `${program.id}: ${field}`).not.toBe(field);
      }
    }
  });
});

describe("actions", () => {
  it("carry what reverse planning needs", () => {
    for (const action of APP_CATALOG.actions) {
      expect(action.id).toMatch(/^[a-z0-9_]+$/);
      expect(action.title.length, `${action.id}: title`).toBeGreaterThan(0);
      expect(Number.isFinite(action.effort_minutes), `${action.id}: effort`).toBe(true);

      // A missing duration means "unknown" to the engine and produces
      // needs_data; an instantaneous step has to say zero out loud.
      expect(typeof action.duration_days, `${action.id}: duration_days`).toBe("number");

      if (action.hard_deadline !== undefined) {
        expect(isIsoDate(action.hard_deadline.date), `${action.id}: hard deadline`).toBe(true);
        expect(findSource(action.hard_deadline.source_id), `${action.id}: source`).toBeDefined();
      }

      for (const dependency of action.depends_on) {
        expect(
          APP_CATALOG.actions.some((item) => item.id === dependency),
          `${action.id}: unknown dependency ${dependency}`,
        ).toBe(true);
      }
      for (const unlocked of action.unlocks) {
        expect(
          APP_CATALOG.actions.some((item) => item.id === unlocked),
          `${action.id}: unknown unlock ${unlocked}`,
        ).toBe(true);
      }
    }
  });

  it("have unique ids", () => {
    const ids = APP_CATALOG.actions.map((action) => action.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("sources", () => {
  it("are complete and never claim more than they have", () => {
    for (const source of SOURCES) {
      expect(source.id.length).toBeGreaterThan(0);
      expect(source.title.length).toBeGreaterThan(0);
      expect(source.publisher.length).toBeGreaterThan(0);

      // A record can only call itself verified if a human opened something.
      if (source.confidence === "verified") {
        expect(source.url, `${source.id}: verified without a url`).toBeDefined();
        expect(source.accessed_at, `${source.id}: verified without a date`).toBeDefined();
      }
      if (source.accessed_at !== undefined) expect(isIsoDate(source.accessed_at)).toBe(true);
    }
  });

  it("never claims more about a date than the source said", () => {
    const levels = { verified: 0, derived: 0, last_cycle: 0, demo: 0, none: 0 };

    for (const program of APP_CATALOG.programs) {
      const deadline = program.application_deadline;
      if (deadline === undefined) {
        levels.none += 1;
        continue;
      }
      levels[deadline.confidence] += 1;

      // A date called verified has to trace to something a person can open.
      if (deadline.confidence === "verified") {
        const source = findSource(deadline.source_id);
        expect(source?.url, `${program.id}: verified deadline without a url`).toBeDefined();
      }
    }

    // The catalogue is real, so it is a mixture — and the mixture is the point.
    expect(levels.verified).toBeGreaterThan(0);
    expect(levels.derived).toBeGreaterThan(0);
    expect(levels.none).toBeGreaterThan(0);
    expect(levels.demo).toBe(0);
  });

  it("reads the deadline a human reads, on the sentences that used to fool it", () => {
    // Every line here is a bug the importer once had. The source text is prose
    // with four kinds of date in it, and each of these picked the wrong one:
    // a language test, a financial-aid date, a document stage, the start of
    // term. They are pinned because a parser regression is invisible — the
    // product still shows a confident date, just the wrong one.
    const expected: Readonly<Record<string, string | null>> = {
      mit: "2027-01-04", // не 31 января — это языковой тест, и не 15 февраля — финпомощь
      cmu: "2027-01-04", // не 1 мая — подтверждение места
      kyoto: "2026-12-03", // не 1 октября 2027 — начало учёбы
      ubc: "2027-01-15", // не 15 марта — досылка аттестата
      waterloo: "2027-02-01", // не 15 февраля — досылка документов
      epfl: "2027-04-30", // не 10 июля — второй этап документов
      tudelft: "2027-04-01", // не 1 июня — подтверждение места
      utokyo: "2025-12-09", // не 7 мая — подтверждение зачисления
      berkeley: "2026-11-30", // не 31 января — языковое требование
      bocconi: "2027-01-26", // Winter round: его чуть не выбросило примечание о результате
      mcmaster: null, // вуз прямо пишет, что единой даты нет
      uj: null, // «уточнять в системе подачи» — не дата
    };

    for (const [id, date] of Object.entries(expected)) {
      const program = APP_CATALOG.programs.find((item) => item.id === id);
      expect(program, id).toBeDefined();
      expect(program?.application_deadline?.date ?? null, id).toBe(date);
    }
  });

  it("turns an unreadable deadline into needs_data, never into a date", () => {
    const route = computeRoute(DEMO_PROFILE, CATALOG, TODAY);
    const undated = APP_CATALOG.programs.filter((item) => item.application_deadline === undefined);

    expect(undated.length).toBeGreaterThan(0);
    for (const program of undated) {
      const door = route.doors.find((item) => item.program_id === program.id);
      expect(door?.status, `${program.id}`).toBe("needs_data");
      expect(door?.point_of_no_return).toBeUndefined();
      // And the applicant still gets the university's own sentence to read.
      expect(program.notes?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("questions and leverage", () => {
  it("only name fields the engine can write", () => {
    for (const question of QUESTION_CATALOG) {
      expect(question.options.length, `${question.id}: options`).toBeGreaterThan(0);
      for (const option of question.options) {
        expect(option.value.length).toBeGreaterThan(0);
        expect(option.label.length).toBeGreaterThan(0);
      }
    }
    for (const candidate of LEVERAGE_CANDIDATES) {
      expect(candidate.title.length).toBeGreaterThan(0);
      expect(Number.isFinite(candidate.effort_minutes)).toBe(true);
    }
  });

  it("has unique question and candidate ids", () => {
    const questionIds = QUESTION_CATALOG.map((question) => question.id);
    expect(new Set(questionIds).size).toBe(questionIds.length);

    const candidateIds = LEVERAGE_CANDIDATES.map((candidate) => candidate.id);
    expect(new Set(candidateIds).size).toBe(candidateIds.length);
  });
});

describe("the catalogue as the engine sees it", () => {
  it("produces a board where every route is accounted for", () => {
    const route = computeRoute(DEMO_PROFILE, CATALOG, TODAY);

    expect(route.doors).toHaveLength(APP_CATALOG.programs.length);
    expect(
      route.summary.open +
        route.summary.closing_soon +
        route.summary.closed +
        route.summary.needs_data,
    ).toBe(route.summary.total);

    // A date is either computed or absent. Never a placeholder.
    for (const door of route.doors) {
      if (door.point_of_no_return !== undefined) {
        expect(isIsoDate(door.point_of_no_return), door.program_id).toBe(true);
      } else {
        expect(door.status).toBe("needs_data");
      }
    }
  });
});
