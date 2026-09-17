import { describe, expect, it } from "vitest";

import { addDays, daysBetween } from "@/lib/date";
import {
  CLOSING_SOON_DAYS,
  computeLatestStartDate,
  computePointOfNoReturn,
  isIsoDate,
  type ScheduleChainEntry,
  type ScheduleResult,
} from "@/lib/engine";
import type { ActionStep, DateFact, Program } from "@/lib/types";

/**
 * Reverse planning is the arithmetic the whole product rests on: if a point of
 * no return is one day late, an applicant misses a registration and never
 * learns why. These tests pin the two guarantees — the date is the *last*
 * admissible day, and missing data becomes `needs_data` instead of a guess.
 */

const TODAY = "2026-09-17";

function fact(date: string): DateFact {
  return { date, confidence: "verified", source_id: "src-test", checked_at: "2026-09-01" };
}

function action(id: string, over: Partial<ActionStep> = {}): ActionStep {
  return {
    id,
    title: id,
    kind: "preparation",
    depends_on: [],
    effort_minutes: 15,
    unlocks: [],
    source_id: "src-test",
    ...over,
  };
}

function catalogue(...steps: ActionStep[]): Record<string, ActionStep> {
  return Object.fromEntries(steps.map((step) => [step.id, step]));
}

function program(over: Partial<Program> = {}): Program {
  return {
    id: "prog-test",
    name: "Test programme",
    org: "Test org",
    country: "US",
    level: "bachelor",
    fields: ["tech"],
    language: ["en"],
    tuition_per_year: { amount: 0, currency: "USD", confidence: "verified", source_id: "src-test" },
    funding: ["none"],
    requirements: [],
    action_chain: [],
    application_deadline: fact("2027-01-15"),
    ...over,
  };
}

function entryOf(result: ScheduleResult, actionId: string): ScheduleChainEntry {
  const entry = result.chain.find((item) => item.action_id === actionId);
  if (!entry) throw new Error(`No chain entry for ${actionId}`);
  return entry;
}

/**
 * The canonical case from the product brief:
 *
 *   application deadline 2027-01-15
 *     ← 14 days waiting for the score
 *       ← the sitting, last one 2026-12-05
 *         ← registration, closes 2026-11-20
 */
const SAT_ACTIONS = catalogue(
  action("sat_reg", {
    kind: "exam_registration",
    hard_deadline: fact("2026-11-20"),
    duration_days: 0,
    unlocks: ["sat_exam"],
  }),
  action("sat_exam", {
    kind: "exam",
    hard_deadline: fact("2026-12-05"),
    duration_days: 1,
    depends_on: ["sat_reg"],
  }),
  action("sat_wait", { duration_days: 14, depends_on: ["sat_exam"] }),
  action("apply", {
    kind: "application",
    hard_deadline: fact("2027-01-15"),
    duration_days: 0,
    depends_on: ["sat_wait"],
  }),
);

const SAT_PROGRAM = program({ action_chain: ["apply", "sat_wait", "sat_exam", "sat_reg"] });

describe("computePointOfNoReturn · цепочка зависимостей", () => {
  it("закрывает путь на регистрации, а не на дате подачи", () => {
    const result = computePointOfNoReturn(SAT_PROGRAM, SAT_ACTIONS, TODAY);

    expect(result.status).toBe("open");
    expect(result.point_of_no_return).toBe("2026-11-20");
    expect(result.critical_action_id).toBe("sat_reg");
    expect(result.days_remaining).toBe(daysBetween(TODAY, "2026-11-20"));
    expect(result.missing_data).toEqual([]);
  });

  it("раскладывает всю цепочку назад по каждому шагу", () => {
    const result = computePointOfNoReturn(SAT_PROGRAM, SAT_ACTIONS, TODAY);

    expect(entryOf(result, "apply").latest_start_date).toBe("2027-01-15");
    expect(entryOf(result, "sat_wait").latest_start_date).toBe("2027-01-01");
    expect(entryOf(result, "sat_exam").latest_start_date).toBe("2026-12-04");
    expect(entryOf(result, "sat_reg").latest_start_date).toBe("2026-11-20");
  });

  it("отдаёт цепочку в хронологическом порядке latest_start", () => {
    const result = computePointOfNoReturn(SAT_PROGRAM, SAT_ACTIONS, TODAY);

    expect(result.chain.map((item) => item.action_id)).toEqual([
      "sat_reg",
      "sat_exam",
      "sat_wait",
      "apply",
    ]);
  });

  it("подтягивает шаги, до которых можно добраться только через depends_on", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["apply"] }),
      SAT_ACTIONS,
      TODAY,
    );

    expect(result.chain.map((item) => item.action_id)).toContain("sat_reg");
    expect(result.point_of_no_return).toBe("2026-11-20");
  });

  it("читает unlocks как то же ребро, записанное вперёд", () => {
    const actions = catalogue(
      action("reg", { duration_days: 0, hard_deadline: fact("2026-10-01"), unlocks: ["exam"] }),
      action("exam", { duration_days: 20 }),
    );
    const result = computePointOfNoReturn(
      program({ action_chain: ["reg", "exam"] }),
      actions,
      TODAY,
    );

    // exam ограничен дедлайном подачи: 2027-01-15 − 20 = 2026-12-26,
    // reg — своим жёстким дедлайном, он и есть точка невозврата.
    expect(entryOf(result, "exam").latest_start_date).toBe("2026-12-26");
    expect(result.point_of_no_return).toBe("2026-10-01");
    expect(result.critical_action_id).toBe("reg");
  });

  it("детерминирован: два прогона дают идентичный результат", () => {
    const first = computePointOfNoReturn(SAT_PROGRAM, SAT_ACTIONS, TODAY);
    const second = computePointOfNoReturn(SAT_PROGRAM, SAT_ACTIONS, TODAY);

    expect(first).toEqual(second);
  });
});

describe("computePointOfNoReturn · длительность шага", () => {
  it("вычитает duration_days из дедлайна следующего шага", () => {
    const actions = catalogue(
      action("docs", { kind: "document", duration_days: 30, unlocks: ["apply"] }),
      action("apply", { kind: "application", duration_days: 0, hard_deadline: fact("2027-01-15") }),
    );
    const result = computePointOfNoReturn(
      program({ action_chain: ["docs", "apply"] }),
      actions,
      TODAY,
    );

    expect(entryOf(result, "docs").latest_start_date).toBe("2026-12-16");
    expect(result.point_of_no_return).toBe("2026-12-16");
    expect(result.critical_action_id).toBe("docs");
  });

  it("считает duration_days: 0 явным нулём, а не отсутствием данных", () => {
    const actions = catalogue(action("apply", { duration_days: 0 }));
    const result = computePointOfNoReturn(program({ action_chain: ["apply"] }), actions, TODAY);

    expect(result.status).toBe("open");
    expect(result.point_of_no_return).toBe("2027-01-15");
  });

  it("складывает длительности вдоль цепочки", () => {
    const actions = catalogue(
      action("prep", { duration_days: 60, unlocks: ["test"] }),
      action("test", { kind: "language_test", duration_days: 10, unlocks: ["apply"] }),
      action("apply", { kind: "application", duration_days: 0 }),
    );
    const result = computePointOfNoReturn(
      program({ action_chain: ["prep", "test", "apply"] }),
      actions,
      TODAY,
    );

    // 2027-01-15 − 10 = 2027-01-05, затем −60 = 2026-11-06.
    expect(entryOf(result, "test").latest_start_date).toBe("2027-01-05");
    expect(result.point_of_no_return).toBe("2026-11-06");
  });
});

describe("computePointOfNoReturn · более раннее ограничение побеждает", () => {
  it("берёт жёсткий дедлайн, когда он раньше расчётного", () => {
    const actions = catalogue(
      action("docs", {
        kind: "document",
        duration_days: 30,
        hard_deadline: fact("2026-11-01"),
        unlocks: ["apply"],
      }),
      action("apply", { kind: "application", duration_days: 0 }),
    );
    const result = computePointOfNoReturn(
      program({ action_chain: ["docs", "apply"] }),
      actions,
      TODAY,
    );

    // Расчёт от подачи дал бы 2026-12-16, но свой дедлайн шага раньше.
    expect(entryOf(result, "docs").hard_deadline).toBe("2026-11-01");
    expect(entryOf(result, "docs").latest_start_date).toBe("2026-10-02");
    expect(result.point_of_no_return).toBe("2026-10-02");
  });

  it("игнорирует жёсткий дедлайн, который позже расчётного", () => {
    const actions = catalogue(
      action("docs", {
        kind: "document",
        duration_days: 30,
        hard_deadline: fact("2027-06-01"),
        unlocks: ["apply"],
      }),
      action("apply", { kind: "application", duration_days: 0 }),
    );
    const result = computePointOfNoReturn(
      program({ action_chain: ["docs", "apply"] }),
      actions,
      TODAY,
    );

    expect(entryOf(result, "docs").latest_start_date).toBe("2026-12-16");
    expect(result.point_of_no_return).toBe("2026-12-16");
  });

  it("выбирает самую раннюю latest_start среди нескольких ограничивающих шагов", () => {
    const actions = catalogue(
      action("early", { duration_days: 0, hard_deadline: fact("2026-10-10"), unlocks: ["apply"] }),
      action("earliest", { duration_days: 5, hard_deadline: fact("2026-10-08") }),
      action("late", { duration_days: 0, hard_deadline: fact("2026-12-01") }),
      action("apply", { kind: "application", duration_days: 0 }),
    );
    const result = computePointOfNoReturn(
      program({ action_chain: ["early", "earliest", "late", "apply"] }),
      actions,
      TODAY,
    );

    // early → 2026-10-10, earliest → 2026-10-03, late → 2026-12-01.
    expect(result.point_of_no_return).toBe("2026-10-03");
    expect(result.critical_action_id).toBe("earliest");
    expect(result.days_remaining).toBe(daysBetween(TODAY, "2026-10-03"));
  });
});

describe("computePointOfNoReturn · статусы", () => {
  it("закрывает дверь, когда точка невозврата уже позади", () => {
    const actions = catalogue(
      action("apply", { kind: "application", duration_days: 0, hard_deadline: fact("2026-09-01") }),
    );
    const result = computePointOfNoReturn(
      program({ action_chain: ["apply"], application_deadline: fact("2026-09-01") }),
      actions,
      TODAY,
    );

    expect(result.status).toBe("closed");
    expect(result.point_of_no_return).toBe("2026-09-01");
    expect(result.days_remaining).toBe(-16);
  });

  it("сегодня ровно точка невозврата: остаётся 0 дней и дверь ещё не закрыта", () => {
    const actions = catalogue(
      action("apply", { kind: "application", duration_days: 0, hard_deadline: fact(TODAY) }),
    );
    const result = computePointOfNoReturn(
      program({ action_chain: ["apply"], application_deadline: fact(TODAY) }),
      actions,
      TODAY,
    );

    expect(result.days_remaining).toBe(0);
    expect(result.status).toBe("closing_soon");
    expect(result.critical_action_id).toBe("apply");
  });

  it("переключается на closing_soon ровно на пороге", () => {
    const boundary = addDays(TODAY, CLOSING_SOON_DAYS);
    const justOutside = addDays(TODAY, CLOSING_SOON_DAYS + 1);

    const at = computePointOfNoReturn(
      program({ action_chain: ["apply"], application_deadline: fact(boundary) }),
      catalogue(action("apply", { kind: "application", duration_days: 0 })),
      TODAY,
    );
    const beyond = computePointOfNoReturn(
      program({ action_chain: ["apply"], application_deadline: fact(justOutside) }),
      catalogue(action("apply", { kind: "application", duration_days: 0 })),
      TODAY,
    );

    expect(at.days_remaining).toBe(CLOSING_SOON_DAYS);
    expect(at.status).toBe("closing_soon");
    expect(beyond.status).toBe("open");
  });

  it("без обязательных шагов последним днём остаётся сама дата подачи", () => {
    const result = computePointOfNoReturn(program(), {}, TODAY);

    expect(result.status).toBe("open");
    expect(result.point_of_no_return).toBe("2027-01-15");
    expect(result.chain).toEqual([]);
    expect(result.critical_action_id).toBeUndefined();
  });
});

describe("computePointOfNoReturn · недостающие данные", () => {
  it("не находит шаг из цепочки и называет его id", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["apply", "ielts"] }),
      catalogue(action("apply", { kind: "application", duration_days: 0 })),
      TODAY,
    );

    expect(result.status).toBe("needs_data");
    expect(result.missing_data).toContain("ielts");
    expect(result.point_of_no_return).toBeUndefined();
    expect(result.days_remaining).toBeUndefined();
  });

  it("не находит шаг, на который ссылается depends_on", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["apply"] }),
      catalogue(action("apply", { duration_days: 0, depends_on: ["missing_exam"] })),
      TODAY,
    );

    expect(result.status).toBe("needs_data");
    expect(result.missing_data).toContain("missing_exam");
  });

  it("не подставляет ноль вместо неизвестной длительности", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["docs", "apply"] }),
      catalogue(
        action("docs", { kind: "document", unlocks: ["apply"] }),
        action("apply", { kind: "application", duration_days: 0 }),
      ),
      TODAY,
    );

    expect(result.status).toBe("needs_data");
    expect(result.missing_data).toContain("docs.duration_days");
    expect(result.point_of_no_return).toBeUndefined();
    expect(entryOf(result, "docs").latest_start_date).toBeUndefined();
  });

  it("отклоняет отрицательную и дробную длительность", () => {
    const negative = computePointOfNoReturn(
      program({ action_chain: ["docs"] }),
      catalogue(action("docs", { duration_days: -5 })),
      TODAY,
    );
    const fractional = computePointOfNoReturn(
      program({ action_chain: ["docs"] }),
      catalogue(action("docs", { duration_days: 1.5 })),
      TODAY,
    );

    expect(negative.missing_data).toContain("docs.duration_days");
    expect(fractional.missing_data).toContain("docs.duration_days");
  });

  it("не принимает несуществующую дату подачи", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["apply"], application_deadline: fact("2027-02-29") }),
      catalogue(action("apply", { kind: "application", duration_days: 0 })),
      TODAY,
    );

    expect(result.status).toBe("needs_data");
    expect(result.missing_data).toContain("program.application_deadline");
  });

  it("не принимает нечитаемый жёсткий дедлайн шага", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["apply"] }),
      catalogue(
        action("apply", { kind: "application", duration_days: 0, hard_deadline: fact("15.01.2027") }),
      ),
      TODAY,
    );

    expect(result.status).toBe("needs_data");
    expect(result.missing_data).toContain("apply.hard_deadline");
  });

  it("не считает цепочку, которая зависит от самой себя", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["a", "b"] }),
      catalogue(
        action("a", { duration_days: 1, depends_on: ["b"] }),
        action("b", { duration_days: 1, depends_on: ["a"] }),
      ),
      TODAY,
    );

    expect(result.status).toBe("needs_data");
    expect(result.missing_data).toEqual(["a.depends_on", "b.depends_on"]);
  });

  it("бросает ошибку на некорректном today: это ошибка вызова, а не данных", () => {
    expect(() => computePointOfNoReturn(SAT_PROGRAM, SAT_ACTIONS, "17.09.2026")).toThrow(
      /not an ISO date/,
    );
  });
});

describe("арифметика дат", () => {
  it("переходит через границу месяца", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["prep"], application_deadline: fact("2026-10-05") }),
      catalogue(action("prep", { duration_days: 10 })),
      TODAY,
    );

    expect(result.point_of_no_return).toBe("2026-09-25");
  });

  it("переходит через границу года", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["prep"], application_deadline: fact("2027-01-05") }),
      catalogue(action("prep", { duration_days: 10 })),
      TODAY,
    );

    expect(result.point_of_no_return).toBe("2026-12-26");
    expect(result.days_remaining).toBe(daysBetween(TODAY, "2026-12-26"));
  });

  it("считает 29 февраля в високосном году и пропускает его в обычном", () => {
    const leap = computePointOfNoReturn(
      program({ action_chain: ["prep"], application_deadline: fact("2028-03-01") }),
      catalogue(action("prep", { duration_days: 1 })),
      TODAY,
    );
    const common = computePointOfNoReturn(
      program({ action_chain: ["prep"], application_deadline: fact("2027-03-01") }),
      catalogue(action("prep", { duration_days: 1 })),
      TODAY,
    );

    expect(leap.point_of_no_return).toBe("2028-02-29");
    expect(common.point_of_no_return).toBe("2027-02-28");
  });

  it("проходит через февраль високосного года целой цепочкой", () => {
    const result = computePointOfNoReturn(
      program({ action_chain: ["prep"], application_deadline: fact("2028-03-10") }),
      catalogue(action("prep", { duration_days: 40 })),
      TODAY,
    );

    // 2028-03-10 − 40 дней = 2028-01-30: февраль високосного года даёт 29 дней.
    expect(result.point_of_no_return).toBe("2028-01-30");
  });

  it("computeLatestStartDate — чистая функция без побочных эффектов", () => {
    expect(computeLatestStartDate("2027-01-15", 14)).toBe("2027-01-01");
    expect(computeLatestStartDate("2027-01-15", 0)).toBe("2027-01-15");
    expect(computeLatestStartDate("2028-03-01", 1)).toBe("2028-02-29");
  });

  it("isIsoDate принимает только существующие календарные даты", () => {
    expect(isIsoDate("2026-09-17")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-9-17")).toBe(false);
    expect(isIsoDate("17 сентября 2026")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});
