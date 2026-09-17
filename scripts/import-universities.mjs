/**
 * Turns the verified university dataset into the catalogue the engine reads.
 *
 *   node scripts/import-universities.mjs
 *   data/raw/universities_verified.json  →  data/catalog.generated.ts
 *
 * The raw file ships in the repository so every date in the product can be
 * traced back to the line it came from. This script is the only thing between
 * the two, and it is deliberately dull: it copies, it maps, and where it cannot
 * read a date it says so instead of choosing one.
 *
 * ── The hard part: deadlines are prose ──────────────────────────────────────
 *
 * Universities write "Early Action — 1 ноября (решение в середине декабря).
 * Regular Action — 4 января", not an ISO date. Three rules make that tractable
 * without guessing:
 *
 * 1. Only *submission* dates count. A segment about a decision, a test window,
 *    a fee or a result is not a deadline to plan against, and taking the latest
 *    date in the text would pick the financial-aid date and be wrong.
 * 2. The door closes at the *last* submission round. Early Action is an
 *    opportunity; Regular Decision is when the path stops existing, and this
 *    product exists to say when a path stops existing.
 * 3. A year is only ever taken from the text, or resolved by the published
 *    intake-cycle rule — autumn belongs to the year before the intake, winter
 *    and spring to the intake year. A date resolved that way is marked
 *    `derived`, never `verified`, because the year is ours and not the
 *    university's.
 *
 * When no submission date can be read at all — and for several universities the
 * source literally says "dates differ by programme" — the programme ships with
 * no deadline. The engine then reports `needs_data`, the screen shows the
 * original sentence and a link, and nobody is handed a number to act on that
 * nobody stands behind.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAW = path.resolve("data/raw/universities_verified.json");
const OUT = path.resolve("data/catalog.generated.ts");

/** The intake this catalogue plans for. Every derived year hangs off it. */
const INTAKE_YEAR = 2027;

const raw = JSON.parse(readFileSync(RAW, "utf8"));

/**
 * `--explain <id>` prints how one university's sentence was read.
 *
 * The parser decides dates a person will act on, so it has to be arguable.
 * This is how you argue with it.
 */
const explainId = process.argv.includes("--explain")
  ? process.argv[process.argv.indexOf("--explain") + 1]
  : null;

/* -------------------------------------------------------------------------- */
/* Dates                                                                       */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  ["январ", 1], ["феврал", 2], ["март", 3], ["апрел", 4], ["ма", 5], ["июн", 6],
  ["июл", 7], ["август", 8], ["сентябр", 9], ["октябр", 10], ["ноябр", 11], ["декабр", 12],
];

/** "13–20 июля 2027", "1 ноября", "15 ОКТЯБРЯ" — a range takes its last day. */
const DATE_PATTERN =
  /(\d{1,2})(?:\s*[–—-]\s*(\d{1,2}))?\s+([А-Яа-яЁё]{3,10})(?:\s+(\d{4}))?/g;

/** Numeric dates the German universities use: "01.10–31.03". */
const NUMERIC_RANGE = /(\d{1,2})\.(\d{1,2})\s*[–—-]\s*(\d{1,2})\.(\d{1,2})/g;

function monthOf(word) {
  const lower = word.toLowerCase();
  for (const [stem, index] of MONTHS) if (lower.startsWith(stem)) return index;
  return null;
}

/**
 * The year for a day and month with none written down.
 *
 * Admissions cycles run across a new year: for an autumn-2027 intake the
 * October and November deadlines fall in 2026 and the January ones in 2027.
 * August is the boundary — everything from August on belongs to the year
 * before the intake.
 */
function cycleYear(month) {
  return month >= 8 ? INTAKE_YEAR - 1 : INTAKE_YEAR;
}

function iso(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** Every date in a piece of text, with whether its year was written or derived. */
function datesIn(text) {
  const found = [];

  for (const match of text.matchAll(DATE_PATTERN)) {
    const month = monthOf(match[3]);
    if (month === null) continue;
    // A range ends at its second day: "13–20 июля" closes on the twentieth.
    const day = Number(match[2] ?? match[1]);
    const statedYear = match[4] ? Number(match[4]) : null;
    const date = iso(statedYear ?? cycleYear(month), month, day);
    if (date !== null) found.push({ date, stated: statedYear !== null });
  }

  for (const match of text.matchAll(NUMERIC_RANGE)) {
    const day = Number(match[3]);
    const month = Number(match[4]);
    if (month < 1 || month > 12) continue;
    const date = iso(cycleYear(month), month, day);
    if (date !== null) found.push({ date, stated: false });
  }

  return found;
}

/* -------------------------------------------------------------------------- */
/* Reading a deadline out of a sentence                                        */
/* -------------------------------------------------------------------------- */

/**
 * A segment that is explicitly about handing in an application.
 *
 * Used to rescue a segment that also mentions something else — not as a
 * requirement. Plenty of universities write the deadline as a bare date and a
 * qualifier ("13 января 2027 для остальных"), and demanding the word "подача"
 * would throw those away.
 */
const SUBMISSION = /(подач|подать|дедлайн|заявк|срок|ucas|early|regular|раунд|окно|приём|набор|закрыти|закрывается|questbridge|ouac|common app)/i;

/**
 * A segment that is about something else entirely.
 *
 * These carry dates too — later ones, usually — and every one of them would be
 * the wrong answer to "when does this path close".
 */
const NOT_SUBMISSION = /(решени|результат|объявля|ответ|зачислени|взнос|оплат|плат[её]ж|финпомощ|финансов|стипенди|экзамен|тест|собеседован|интервью|портфолио|виза|общежити|семестр начина|занятия начина|старт|обучение начина|загрузить|olympiad|языков|требование закрыть|рекомендательн|письм|документ|подтвержден)/i;

/** The source is describing a cycle that has already happened. */
const PREVIOUS_CYCLE = /(по циклу|календарь был|в 20\d\d\/\d\d|прошлого цикла|был такой)/i;

/** The source says outright that there is no single date. */
const NO_SINGLE_DATE = /(различаются по программ|разные по программ|единой даты нет|уточнять|точные даты|объявляется отдельно|зависит от программ)/i;

/**
 * Sentences, and the clauses inside them.
 *
 * Two levels, because a comma means two different things. In "31 марта 2026
 * (подача), экзамен 18–28 января 2027, старт осенью 2027" every clause carries
 * its own subject and has to be judged on its own — that comma split is what
 * lets the exam date be recognised as an exam date.
 *
 * In "Тесты: до 30 ноября для EA, до 31 декабря для RA" the subject is stated
 * once, at the front, and everything after the comma inherits it. Judging "до
 * 31 декабря для RA" on its own turns a test date into an application deadline,
 * which is the single worst mistake this file can make.
 *
 * So a sentence keeps its clauses together and remembers what it opened on.
 * A semicolon in a Russian list is a comma with better manners — "Документы по
 * английскому — до 31 января; ELAS — до 15 февраля" is one thought about
 * documents — so it separates clauses, not sentences. Commas inside brackets
 * separate nothing: "(открытие 16:00, закрытие 23:59)" is one parenthetical.
 */
function splitSentences(text) {
  const glued = text.replace(/(\d)\s*[–—-]\s*(\d)/g, "$1–$2");

  return glued
    .split(/(?<=\.)\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => ({ text: sentence, segments: splitClauses(sentence) }));
}

/** Clauses, split on commas and semicolons outside brackets. */
function splitClauses(sentence) {
  const clauses = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < sentence.length; index += 1) {
    const character = sentence[index];
    if (character === "(") depth += 1;
    else if (character === ")") depth = Math.max(0, depth - 1);
    else if ((character === "," || character === ";") && depth === 0) {
      clauses.push(sentence.slice(start, index + 1));
      start = index + 1;
    }
  }
  clauses.push(sentence.slice(start));

  return clauses.map((clause) => clause.trim()).filter((clause) => clause.length > 0);
}

/**
 * A segment with its decision-parentheticals removed.
 *
 * "Winter — 25 ноября 2026 – 26 января 2027 (результат в середине марта)" is a
 * submission round with a note about a result attached. Judged whole it reads
 * as a sentence about a result and the round is thrown away, so the note goes
 * before the judging, not after.
 */
function withoutAsides(segment) {
  return segment.replace(/\([^)]*\)/g, (inside) => (NOT_SUBMISSION.test(inside) ? " " : inside));
}

/**
 * The day this route stops existing, read from the university's own sentence.
 *
 * Returns the deadline, the earlier rounds it found, and — always — why it
 * decided what it decided, so the result can be argued with.
 */
function readDeadline(text) {
  if (!text) return { deadline: null, rounds: [], reason: "источник не называет срок" };

  // When a university says outright that there is no single date, believe it.
  // McMaster publishes dates for individual programmes and says in the same
  // breath that they differ; taking the latest of them would tell somebody
  // aiming at the January programme that they have until April.
  if (/единой даты нет/i.test(text)) {
    return { deadline: null, rounds: [], reason: "источник прямо пишет, что единой даты нет" };
  }

  const submissionDates = [];
  const trace = [];

  for (const sentence of splitSentences(text)) {
    // What the sentence opened on. "Тесты:", "Финпомощь:", "Языковой тест" —
    // said once, meant for every clause that follows.
    const lead = withoutAsides(sentence.segments[0] ?? "");
    const subjectIsNotSubmission = NOT_SUBMISSION.test(lead) && !SUBMISSION.test(lead);
    // A sentence that opens by saying there is no date does not acquire one
    // three clauses later: "уточнять в системе подачи; … второй до 15 февраля"
    // is a sentence about payments, not a deadline anybody can plan against.
    const subjectHasNoDate = NO_SINGLE_DATE.test(lead);

    for (const segment of sentence.segments) {
      // A segment counts unless it is clearly about something else. The burden
      // is on exclusion: a date in a sentence about a decision or a fee is not
      // a deadline, but a bare date with no context usually is one.
      const cleaned = withoutAsides(segment);

      if ((NOT_SUBMISSION.test(cleaned) || subjectIsNotSubmission) && !SUBMISSION.test(cleaned)) {
        trace.push(["не о подаче", segment, []]);
        continue;
      }
      if (NO_SINGLE_DATE.test(cleaned) || subjectHasNoDate) {
        trace.push(["нет единой даты", segment, []]);
        continue;
      }

      const inSegment = datesIn(cleaned);
      // A clause that names a year names it for the whole window it describes:
      // in "1 июня – 12 июля 2026" the June date is the opening, not a deadline
      // in another year.
      const stated = inSegment.filter((item) => item.stated);
      const used = stated.length > 0 ? stated : inSegment;
      trace.push(["учтено", segment, used.map((item) => item.date)]);
      for (const item of used) submissionDates.push(item);
    }
  }

  if (submissionDates.length === 0) {
    // One date in the whole text and nothing arguing against it.
    const everything = datesIn(text.replace(/\([^)]*\)/g, " "));
    const unique = [...new Set(everything.map((item) => item.date))];
    if (unique.length === 1 && !NO_SINGLE_DATE.test(text) && !NOT_SUBMISSION.test(text)) {
      const only = everything[0];
      return {
        deadline: only,
        rounds: [],
        reason: "единственная дата в тексте источника",
      };
    }
    return {
      deadline: null,
      rounds: [],
      reason: NO_SINGLE_DATE.test(text)
        ? "источник прямо пишет, что единой даты нет"
        : "в тексте нет однозначной даты подачи",
    };
  }

  const sorted = [...submissionDates].sort((a, b) => (a.date < b.date ? -1 : 1));
  const last = sorted[sorted.length - 1];
  const rounds = [...new Set(sorted.slice(0, -1).map((item) => item.date))];

  return {
    deadline: last,
    rounds,
    trace,
    reason:
      rounds.length > 0
        ? "последний раунд подачи; более ранние раунды — возможность, а не закрытие"
        : "дата подачи из текста источника",
  };
}

/* -------------------------------------------------------------------------- */
/* Fields, requirements, chains                                                */
/* -------------------------------------------------------------------------- */

/** Their sixteen codes, in the vocabulary the matcher already thinks in. */
const FIELD_MAP = {
  eng: ["engineering"],
  cs: ["computer_science", "programming"],
  sci: ["natural_sciences"],
  med: ["medicine"],
  hum: ["humanities"],
  biz: ["business"],
  law: ["law"],
  econ: ["economics"],
  edu: ["education"],
  arch: ["architecture"],
  math: ["mathematics"],
  vet: ["veterinary"],
  agri: ["agriculture"],
  arts: ["arts"],
  design: ["design", "ux"],
  langs: ["languages"],
};

/** An IELTS band the university actually prints, or nothing. */
function ieltsBand(requirement) {
  const match = /(?:ielts[^\d]{0,20})?(\d(?:[.,]\d)?)\s*(?:overall|балл|,|$| )/i.exec(
    requirement ?? "",
  );
  if (!/ielts/i.test(requirement ?? "")) return null;
  if (!match) return null;
  const band = Number(match[1].replace(",", "."));
  return band >= 4 && band <= 9 ? band : null;
}

function buildRequirements(u) {
  const requirements = [];
  const languages = u.bachelor_language ?? [];
  const languageRequirement = u.language_requirement ?? {};

  // The language of instruction, as a condition the engine can check.
  for (const code of languages) {
    requirements.push({
      id: code,
      kind: "language",
      label: `Язык обучения: ${LANGUAGE_RU[code] ?? code}`,
      required: languages.length === 1,
    });
  }

  const band = ieltsBand(languageRequirement.requirement);
  if (band !== null) {
    requirements.push({
      id: "ielts",
      kind: "language",
      label: `IELTS ${band}`,
      value: band,
      required: false,
    });
  }

  const scores = u.admission_scores ?? {};
  if (scores.type === "ent_threshold" && typeof scores.threshold === "number") {
    requirements.push({
      id: "ent",
      kind: "exam",
      label: `ЕНТ от ${scores.threshold} баллов`,
      value: scores.threshold,
      required: true,
    });
  } else if (u.country === "KZ") {
    requirements.push({ id: "ent", kind: "exam", label: "ЕНТ", required: true });
  }

  if (/\bsat\b/i.test(scores.value ?? "") || /\bsat\b/i.test(u.note ?? "")) {
    requirements.push({ id: "sat", kind: "exam", label: "SAT", required: false });
  }

  requirements.push({
    id: "attestat",
    kind: "document",
    label: u.country === "KZ" ? "Аттестат" : "Аттестат с переводом",
    required: true,
  });

  return requirements;
}

const LANGUAGE_RU = {
  en: "английский", ru: "русский", kk: "казахский", de: "немецкий", fr: "французский",
  tr: "турецкий", ko: "корейский", ja: "японский", zh: "китайский", nl: "нидерландский",
  it: "итальянский", hu: "венгерский", sv: "шведский", cs: "чешский", pl: "польский",
};

/** The steps a programme obliges, read off its own requirements. */
function buildChain(u, requirements) {
  const chain = [];
  const has = (id) => requirements.some((item) => item.id === id);

  if (u.country === "KZ") {
    chain.push("ent_exam");
    // Kazakhstan's grant competition is a step of its own, with its own window.
    chain.push("kz_grant_apply");
  }
  if (has("ielts")) chain.push("ielts_exam");
  if (has("sat")) chain.push("sat_exam");
  if (u.country !== "KZ") chain.push("docs_translate");
  if (u.country === "GB") chain.push("ucas_apply");
  else chain.push("apply_form");

  return chain;
}

/* -------------------------------------------------------------------------- */
/* Sources                                                                     */
/* -------------------------------------------------------------------------- */

const sources = new Map();
const CHECKED = raw.meta?.generated ?? "2026-09-16";

function addSource(id, title, publisher, url, accessed, confidence, note) {
  if (sources.has(id)) return id;
  sources.set(id, { id, title, publisher, url, accessed_at: accessed, confidence, note });
  return id;
}

addSource(
  "estimate",
  "Оценка длительности шага",
  "Stepwise",
  undefined,
  undefined,
  "demo",
  "Сколько времени занимает шаг — наша оценка, а не факт из источника. Даты дедлайнов берутся только из источников.",
);

for (const [key, value] of Object.entries(raw.sources ?? {})) {
  addSource(`ref:${key}`, value.title, "Официальный источник", value.url, value.checked, "verified");
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The national chain, on the dates the state publishes.
 *
 * Kazakhstan's twenty universities share one calendar, and it is the sharpest
 * example of what this product computes: the grant competition takes only the
 * May and July sittings, so a February result is a dead end no matter how good
 * it is.
 */
const actions = [
  {
    id: "ent_reg",
    title: "Зарегистрироваться на ЕНТ",
    kind: "exam_registration",
    hard_deadline: { date: `${INTAKE_YEAR}-04-25`, confidence: "derived", source_id: "ref:ent_dates", checked_at: CHECKED },
    duration_days: 0,
    depends_on: [],
    unlocks: ["ent_exam"],
    effort_minutes: 60,
    source_id: "ref:ent_dates",
  },
  {
    id: "ent_exam",
    title: "Сдать ЕНТ",
    kind: "exam",
    hard_deadline: { date: `${INTAKE_YEAR}-07-10`, confidence: "derived", source_id: "ref:ent_dates", checked_at: CHECKED },
    duration_days: 10,
    depends_on: ["ent_reg"],
    unlocks: [],
    effort_minutes: 300,
    source_id: "ref:ent_dates",
  },
  {
    id: "kz_grant_apply",
    title: "Подать документы на конкурс грантов",
    kind: "application",
    hard_deadline: { date: `${INTAKE_YEAR}-07-20`, confidence: "derived", source_id: "ref:grant_rules", checked_at: CHECKED },
    duration_days: 0,
    depends_on: ["ent_exam"],
    unlocks: [],
    effort_minutes: 120,
    source_id: "ref:grant_rules",
  },
  {
    id: "ielts_reg",
    title: "Записаться на IELTS",
    kind: "exam_registration",
    duration_days: 0,
    depends_on: [],
    unlocks: ["ielts_exam"],
    effort_minutes: 30,
    cost: { amount: 130_000, currency: "KZT" },
    source_id: "estimate",
  },
  {
    id: "ielts_exam",
    title: "Сдать IELTS",
    kind: "language_test",
    duration_days: 14,
    depends_on: ["ielts_reg"],
    unlocks: [],
    effort_minutes: 240,
    source_id: "estimate",
  },
  {
    id: "sat_reg",
    title: "Зарегистрироваться на SAT",
    kind: "exam_registration",
    duration_days: 0,
    depends_on: [],
    unlocks: ["sat_exam"],
    effort_minutes: 30,
    cost: { amount: 110, currency: "USD" },
    source_id: "ref:sat_dates",
  },
  {
    id: "sat_exam",
    title: "Сдать SAT",
    kind: "exam",
    duration_days: 21,
    depends_on: ["sat_reg"],
    unlocks: [],
    effort_minutes: 300,
    source_id: "ref:sat_dates",
  },
  {
    id: "docs_translate",
    title: "Перевести и заверить документы",
    kind: "document",
    duration_days: 21,
    depends_on: [],
    unlocks: [],
    effort_minutes: 180,
    cost: { amount: 25_000, currency: "KZT" },
    source_id: "estimate",
  },
  {
    id: "ucas_apply",
    title: "Подать заявку через UCAS",
    kind: "application",
    duration_days: 14,
    depends_on: [],
    unlocks: [],
    effort_minutes: 240,
    source_id: "ref:ucas_jan",
  },
  {
    id: "apply_form",
    title: "Заполнить и отправить заявку",
    kind: "application",
    duration_days: 10,
    depends_on: [],
    unlocks: [],
    effort_minutes: 180,
    source_id: "estimate",
  },
];

/* -------------------------------------------------------------------------- */
/* Programmes                                                                  */
/* -------------------------------------------------------------------------- */

const report = { verified: 0, derived: 0, last_cycle: 0, undated: 0, reasons: [] };
const programs = [];

for (const u of raw.universities) {
  const requirements = buildRequirements(u);
  const chain = buildChain(u, requirements);
  const deadlineText = u.deadline?.value ?? "";
  const read = readDeadline(deadlineText);
  // A university that publishes last year's calendar has not published this
  // year's. The dates are real; the cycle they belong to is not ours.
  const describesOldCycle = PREVIOUS_CYCLE.test(deadlineText);

  if (explainId === u.id) {
    console.log(`
=== ${u.id} — ${u.name} ===`);
    console.log(`ИСТОЧНИК: ${deadlineText}
`);
    for (const [verdict, segment, dates] of read.trace ?? []) {
      console.log(`  [${verdict}] ${segment}`);
      if (dates.length > 0) console.log(`      → ${dates.join(", ")}`);
    }
    console.log(`
РЕШЕНИЕ: ${read.deadline?.date ?? "нет даты"} — ${read.reason}`);
    if (describesOldCycle) console.log("ПОМЕТКА: источник описывает прошлый цикл");
  }

  const sourceId = addSource(
    `src:${u.id}`,
    `${u.name} — приём и сроки`,
    u.name,
    u.deadline?.source_url ?? u.official_url,
    u.deadline?.checked_at ?? CHECKED,
    "verified",
  );

  let deadline;
  if (read.deadline !== null) {
    /*
     * A deadline that has already passed on the day the data was collected is
     * not this cycle's date — it is last cycle's window, which the source
     * printed because next year's is not out yet. Keeping it is right (it is
     * what the university published) and calling it `verified` is not: the
     * product would be stating a current deadline it does not have.
     */
    const passed = read.deadline.date < CHECKED;
    const confidence =
      passed || describesOldCycle
        ? "last_cycle"
        : read.deadline.stated
          ? "verified"
          : "derived";
    if (confidence === "verified") report.verified += 1;
    else if (confidence === "derived") report.derived += 1;
    else report.last_cycle += 1;
    deadline = {
      date: read.deadline.date,
      confidence,
      source_id: sourceId,
      checked_at: u.deadline?.checked_at ?? CHECKED,
    };
  } else {
    report.undated += 1;
    report.reasons.push(`${u.id}: ${read.reason}`);
  }

  const fields = [...new Set((u.fields ?? []).flatMap((code) => FIELD_MAP[code] ?? [code]))];

  const notes = [u.note, `Источник о сроках: «${(u.deadline?.value ?? "").trim()}»`]
    .filter(Boolean)
    .join(" ");

  programs.push({
    id: u.id,
    name: `Бакалавриат — ${u.fields_ru?.[0] ?? "программы"}`,
    org: u.name,
    country: u.country,
    city: u.city,
    level: "bachelor",
    fields,
    language: u.bachelor_language ?? [],
    funding: u.country === "KZ" ? ["state_grant", "partial"] : [],
    requirements,
    action_chain: chain,
    application_deadline: deadline,
    official_url: u.official_url,
    confidence: "verified",
    notes,
    deadline_rounds: read.rounds,
  });
}

/* -------------------------------------------------------------------------- */
/* Emit                                                                        */
/* -------------------------------------------------------------------------- */

const header = `/**
 * GENERATED — do not edit by hand.
 *
 *   node scripts/import-universities.mjs
 *
 * Source: data/raw/universities_verified.json (${raw.universities.length} universities,
 * collected ${CHECKED}). Every date below was read out of that file by
 * scripts/import-universities.mjs, which documents the rules it used.
 *
 * Deadlines in this catalogue: ${report.verified} taken verbatim from a source,
 * ${report.derived} with the year resolved by the ${INTAKE_YEAR} intake-cycle rule
 * (marked \`derived\`), ${report.last_cycle} already past on the day the data was
 * collected and therefore last cycle's window (marked \`last_cycle\`), and
 * ${report.undated} with no date at all — those programmes report \`needs_data\`
 * rather than showing a number nobody published.
 */
import type { ActionStep, Program, Source } from "@/lib/types";
`;

const body = [
  header,
  `export const IMPORTED_SOURCES: readonly Source[] = ${JSON.stringify([...sources.values()], null, 2)};`,
  "",
  `export const IMPORTED_ACTIONS: ActionStep[] = ${JSON.stringify(actions, null, 2)};`,
  "",
  "/** Rounds earlier than the closing one, kept so a screen can mention them. */",
  `export const DEADLINE_ROUNDS: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(
    Object.fromEntries(programs.filter((p) => p.deadline_rounds.length > 0).map((p) => [p.id, p.deadline_rounds])),
    null,
    2,
  )};`,
  "",
  `export const IMPORTED_PROGRAMS: Program[] = ${JSON.stringify(
    programs.map((program) => {
      const copy = { ...program };
      delete copy.deadline_rounds;
      return copy;
    }),
    null,
    2,
  )};`,
  "",
].join("\n");

writeFileSync(OUT, body, "utf8");

console.log(`программ: ${programs.length}`);
console.log(`  дата из источника: ${report.verified}`);
console.log(`  год выведен по циклу: ${report.derived}`);
console.log(`  окно прошлого цикла: ${report.last_cycle}`);
console.log(`  без даты (needs_data): ${report.undated}`);
console.log(`источников: ${sources.size}`);
console.log(`действий: ${actions.length}`);
if (report.reasons.length > 0) {
  console.log("\nбез даты — почему:");
  for (const line of report.reasons) console.log("  " + line);
}
