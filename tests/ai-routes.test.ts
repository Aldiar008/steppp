import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The AI boundary, tested as the thing that must never leak.
 *
 * Every test below drives a real route handler with a fake provider (a
 * stubbed `fetch`, since the Gemini call in `lib/ai/boundary.ts` is a plain
 * REST call with no SDK to mock). The questions they answer are the ones
 * that decide whether this product can be trusted: does an invented date get
 * through, does a missing key break a screen, does a malformed answer retry
 * forever, and is the deterministic answer really always there.
 *
 * `server-only` is stubbed because the route imports it to keep the key off the
 * client; under a test runner it has no browser bundle to protect.
 */
vi.mock("server-only", () => ({}));

/** One entry per expected `fetch` call: a model answer, an HTTP failure, or a timeout. */
type FakeAnswer = string | { status: number } | { timeout: true };

let answers: FakeAnswer[] = [];
let calls = 0;

function geminiResponse(text: string): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn(async (): Promise<Response> => {
  const answer = answers[calls];
  calls += 1;
  if (answer === undefined) throw new Error("провайдер вызван больше раз, чем ожидалось");
  if (typeof answer === "string") return geminiResponse(answer);
  if ("timeout" in answer) throw new DOMException("aborted", "AbortError");
  return new Response("", { status: answer.status });
});

beforeEach(() => {
  answers = [];
  calls = 0;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  vi.unstubAllGlobals();
});

async function post(path: "parse" | "explain" | "diff", body: unknown): Promise<Response> {
  const route = await import(`@/app/api/${path}/route`);
  return (route as { POST: (request: Request) => Promise<Response> }).POST(
    new Request(`http://localhost/api/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const TEXT =
  "Мне 17, 11 класс. Люблю дизайн и код. Родители готовы платить около 1,5 млн тенге в год. Английский B2.";

const DOOR = {
  program_id: "kz-nu-cs",
  program_name: "Computer Science",
  org: "Nazarbayev University",
  country: "KZ",
  status: "closing_soon" as const,
  point_of_no_return: "2026-11-20",
  days_remaining: 12,
  next_critical_action: "Зарегистрироваться на SAT",
  matched_requirements: ["Английский язык обучения"],
  unmatched_requirements: ["SAT от 1200"],
  reasons: ["интересы совпадают с направлениями программы"],
  blockers: [],
  confidence: "demo" as const,
};

const EXPLAIN_BODY = {
  door: DOOR,
  profile_summary: { interests: ["programming"], countries: ["KZ"], languages: ["en"] },
  tone: "friendly",
};

const DIFF_BODY = {
  diff: {
    opened: ["pl-pjatk-cs"],
    closed: [],
    became_data_missing: [],
    became_data_available: [],
    deadline_changes: [],
    next_action_changed: true,
    new_next_action: "Заполнить и отправить заявку",
  },
  changed_field: "Бюджет на год",
  old_value: "1 500 000 ₸",
  new_value: "3 000 000 ₸",
  tone: "friendly",
};

/* -------------------------------------------------------------------------- */
/* /api/parse                                                                  */
/* -------------------------------------------------------------------------- */

describe("POST /api/parse", () => {
  it("returns the model's structured profile when it validates", async () => {
    answers = [
      JSON.stringify({
        profile: { grade: 11, age: 17, interests: ["ux", "programming"] },
        conflicts: [],
        confidence: { grade: "stated", interests: "inferred" },
      }),
    ];

    const response = await post("parse", { text: TEXT, locale: "ru" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.grade).toBe(11);
    expect(body.profile.interests).toEqual(["ux", "programming"]);
    expect(body.confidence.interests).toBe("inferred");
    expect(body.fallback).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on malformed output, then accepts the corrected answer", async () => {
    answers = [
      "конечно! вот профиль: ...",
      JSON.stringify({ profile: { grade: 11 }, conflicts: [], confidence: {} }),
    ];

    const body = await (await post("parse", { text: TEXT, locale: "ru" })).json();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body.fallback).toBe(false);
    expect(body.profile.grade).toBe(11);
  });

  it("falls back after a second malformed answer and never tries a third time", async () => {
    answers = ["не json", "снова не json"];

    const body = await (await post("parse", { text: TEXT, locale: "ru" })).json();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body.fallback).toBe(true);
    // The rule parser still read what the text actually says.
    expect(body.profile.grade).toBe(11);
    expect(body.profile.budget_per_year).toEqual({ amount: 1_500_000, currency: "KZT" });
  });

  it("rejects a profile with fields outside the schema", async () => {
    answers = [
      JSON.stringify({
        profile: { admission_chance: 0.8, grade: 11 },
        conflicts: [],
        confidence: {},
      }),
      JSON.stringify({ profile: { grade: 11 }, conflicts: [], confidence: {} }),
    ];

    const body = await (await post("parse", { text: TEXT, locale: "ru" })).json();

    // Whatever comes back, an admission chance cannot survive the schema.
    expect(body.profile.admission_chance).toBeUndefined();
  });

  it("keeps a contradiction instead of resolving it", async () => {
    delete process.env.GEMINI_API_KEY;

    const body = await (
      await post("parse", {
        text: "Бюджет примерно 1,5 млн тенге в год. Хотя нет, скорее 3 000 долларов.",
        locale: "ru",
      })
    ).json();

    expect(body.fallback).toBe(true);
    expect(body.conflicts).toHaveLength(1);
    expect(body.conflicts[0].field).toBe("budget_per_year");
    expect(body.conflicts[0].values.length).toBeGreaterThan(1);
    // Nothing was picked.
    expect(body.profile.budget_per_year).toBeUndefined();
  });

  it("extracts only what the text says", async () => {
    delete process.env.GEMINI_API_KEY;

    const body = await (await post("parse", { text: TEXT, locale: "ru" })).json();

    expect(body.profile.grade).toBe(11);
    expect(body.profile.budget_per_year).toEqual({ amount: 1_500_000, currency: "KZT" });
    expect(body.profile.languages).toEqual([{ code: "en", level: "B2" }]);
    // Never invented: countries, exams, funding needs.
    expect(body.profile.countries).toBeUndefined();
    expect(body.profile.exams).toBeUndefined();
    expect(body.profile.constraints).toBeUndefined();
    expect(body.confidence.countries).toBe("unknown");
  });

  it("answers without an API key, without calling anything", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await post("parse", { text: TEXT, locale: "ru" });

    expect(response.status).toBe(200);
    expect((await response.json()).fallback).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back immediately when the provider fails, with no retry", async () => {
    answers = [{ status: 429 }];

    const body = await (await post("parse", { text: TEXT, locale: "ru" })).json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body.fallback).toBe(true);
  });

  it("refuses a request that is not shaped like a request", async () => {
    expect((await post("parse", { locale: "ru" })).status).toBe(400);
    expect((await post("parse", { text: "x".repeat(5_000), locale: "ru" })).status).toBe(400);
  });
});

/* -------------------------------------------------------------------------- */
/* /api/explain                                                                */
/* -------------------------------------------------------------------------- */

describe("POST /api/explain", () => {
  it("returns a grounded answer from the model", async () => {
    answers = [
      JSON.stringify({
        text: "Путь закрывается: до последнего дня осталось 12. Всё держится на регистрации на SAT — с неё и начни.",
      }),
    ];

    const body = await (await post("explain", EXPLAIN_BODY)).json();

    expect(body.grounded).toBe(true);
    expect(body.text).toContain("12");
  });

  it("throws away an answer with an invented number", async () => {
    answers = [
      JSON.stringify({ text: "У тебя есть ещё 45 дней, чтобы спокойно подготовиться." }),
    ];

    const body = await (await post("explain", EXPLAIN_BODY)).json();

    expect(body.grounded).toBe(true); // the template is grounded by construction
    expect(body.text).not.toContain("45");
    expect(body.text).toContain("12");
  });

  it("throws away an answer with an invented date", async () => {
    answers = [
      JSON.stringify({ text: "Подать документы нужно до 2027-01-15, иначе путь закроется." }),
    ];

    const body = await (await post("explain", EXPLAIN_BODY)).json();

    expect(body.text).not.toContain("2027");
    // The template writes the date the way a person reads it.
    expect(body.text).toContain("20 ноября 2026");
  });

  it("throws away anything with a percentage", async () => {
    answers = [JSON.stringify({ text: "Твои шансы на этом пути — около 80%." })];

    const body = await (await post("explain", EXPLAIN_BODY)).json();

    expect(body.text).not.toContain("%");
  });

  it("accepts a date written the way people write it", async () => {
    answers = [
      JSON.stringify({
        text: "Начать нужно не позже 20 ноября 2026 года — это последний день, когда путь ещё собирается.",
      }),
    ];

    const body = await (await post("explain", EXPLAIN_BODY)).json();

    expect(body.grounded).toBe(true);
    expect(body.text).toContain("20 ноября 2026");
  });

  it("falls back on a timeout, a rate limit and a missing key", async () => {
    answers = [{ timeout: true }];
    let body = await (await post("explain", EXPLAIN_BODY)).json();
    expect(body.text).toContain("Computer Science");

    calls = 0;
    answers = [{ status: 429 }];
    body = await (await post("explain", EXPLAIN_BODY)).json();
    expect(body.text).toContain("Computer Science");

    delete process.env.GEMINI_API_KEY;
    calls = 0;
    answers = [];
    body = await (await post("explain", EXPLAIN_BODY)).json();
    expect(body.text).toContain("Computer Science");
    expect(body.grounded).toBe(true);
  });

  it("retries a malformed answer exactly once", async () => {
    answers = ["не json", JSON.stringify({ text: "Осталось 12 дней до последнего дня старта." })];

    const body = await (await post("explain", EXPLAIN_BODY)).json();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body.text).toContain("12");
  });
});

/* -------------------------------------------------------------------------- */
/* /api/diff                                                                   */
/* -------------------------------------------------------------------------- */

describe("POST /api/diff", () => {
  it("returns grounded wording for an already-computed difference", async () => {
    answers = [
      JSON.stringify({
        headline: "После изменения бюджета открылся ещё 1 путь.",
        reasons: ["Следующий шаг теперь — заполнить и отправить заявку."],
      }),
    ];

    const body = await (await post("diff", DIFF_BODY)).json();

    expect(body.grounded).toBe(true);
    expect(body.headline).toContain("1 путь");
  });

  it("throws away an invented count", async () => {
    answers = [
      JSON.stringify({ headline: "Открылось 6 новых путей.", reasons: [] }),
    ];

    const body = await (await post("diff", DIFF_BODY)).json();

    expect(body.headline).not.toContain("6");
    // The deterministic wording counts from the diff itself.
    expect(body.headline).toContain("1");
  });

  it("throws away an invented date", async () => {
    answers = [
      JSON.stringify({ headline: "Срок сдвинулся на 12 января.", reasons: [] }),
    ];

    const body = await (await post("diff", DIFF_BODY)).json();

    expect(body.headline).not.toContain("12 января");
  });

  it("keeps the supplied diff authoritative when the model is unavailable", async () => {
    delete process.env.GEMINI_API_KEY;

    const body = await (await post("diff", DIFF_BODY)).json();

    expect(body.reasons.some((line: string) => line.includes("Открылось путей: 1"))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a request without a computed difference", async () => {
    expect((await post("diff", { changed_field: "Бюджет" })).status).toBe(400);
  });
});
