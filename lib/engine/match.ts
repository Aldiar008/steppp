/**
 * Matching a profile against a programme.
 *
 * Two questions look alike and are not the same:
 *
 *   "does this programme fit me?"        → match
 *   "can I still physically make it?"    → schedule
 *
 * This module answers the first and then *joins* it to the second without
 * mixing them. A programme can fit perfectly and be unreachable because the
 * registration that feeds its deadline closed last week; a programme can fit
 * moderately and still be the best move available today. Collapsing the two
 * into one number is how a plan starts lying, so `Door.status` here comes from
 * the calendar alone and `Door.score` from the fit alone.
 *
 * Three rules hold everywhere below:
 *
 * 1. No model, no network, no clock, no randomness. `today` is an argument.
 *    Same inputs in, byte-identical result out.
 * 2. Nothing is invented. Two currencies with no rate between them are not
 *    compared, an absent language level is not assumed, an unstated interest
 *    list is not read as "no interests". Unknown is reported as unknown.
 * 3. `score` is a *match* score on 0-100, used for ordering and explanation.
 *    It is not a probability, an admission chance or a likelihood. Nothing in
 *    this file may rename it so, and no caller may present it that way.
 *
 * Weights live in `data/weights.json`, never inline, so the formula can be
 * read and changed in one place.
 */
import { countryName, DESTINATIONS, HOME_COUNTRIES } from "@/data/countries";
import { formatDateRu } from "@/lib/date";
import { languageName } from "@/data/languages";
import { specialtyLabel } from "@/data/specialties";
import weightsConfig from "@/data/weights.json";
import type {
  ActionStep,
  Confidence,
  Currency,
  Door,
  Iso,
  Profile,
  Program,
  Requirement,
} from "@/lib/types";
import { computePointOfNoReturn } from "./schedule";

/* -------------------------------------------------------------------------- */
/* Result shape                                                                */
/* -------------------------------------------------------------------------- */

/** The soft dimensions the score is built from. Keys match `weights.json`. */
export type MatchDimension = "interest" | "country" | "language" | "funding" | "other_fit";

export interface MatchComponent {
  dimension: MatchDimension;
  /** Weight as configured, before normalisation. */
  weight: number;
  /** 0-1 fit on this dimension, or `null` when the data cannot decide it. */
  value: number | null;
}

/**
 * What matching worked out, before the calendar has a say.
 *
 * `hard_pass` is the gate: false means the applicant violates a constraint they
 * themselves stated, so the programme is not a real option no matter how well
 * it scores. `score` is unaffected by it — fit and eligibility are different
 * facts and the UI needs both.
 */
export interface MatchResult {
  /** Match score, 0-100. Not a probability and not an admission chance. */
  score: number;

  hard_pass: boolean;

  /** Requirement ids the profile already covers. */
  matched: string[];
  /** Requirement ids not covered yet, including the ones data cannot decide. */
  unmatched: string[];

  /** Human-readable, checkable statements of what makes this impossible. */
  blockers: string[];
  /** Human-readable, checkable statements of what fits. */
  reasons: string[];

  /**
   * Machine-readable notes about *missing* data, so a screen can say "cannot
   * compare" instead of showing a confident wrong answer. Stable strings, e.g.
   * `"budget_currency_mismatch"`, `"language_unknown"`, `"ielts.score_unknown"`.
   */
  signals: string[];

  /** Per-dimension breakdown, so the score can always be explained. */
  components: MatchComponent[];

  /** True when tuition and budget were actually comparable and compared. */
  tuition_compared: boolean;
}

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

interface WeightsFile {
  version: number;
  match: Record<string, number>;
  interest_hit: { exact: number; related: number };
}

const CONFIG = weightsConfig as unknown as WeightsFile;

const DIMENSIONS: readonly MatchDimension[] = [
  "interest",
  "country",
  "language",
  "funding",
  "other_fit",
];

/** A malformed weights file is a programming error, not applicant data. */
function configuredWeight(dimension: MatchDimension): number {
  const value = CONFIG.match[dimension];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`weights.json: match.${dimension} must be a finite number >= 0`);
  }
  return value;
}

function configuredHit(kind: "exact" | "related"): number {
  const value = CONFIG.interest_hit[kind];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`weights.json: interest_hit.${kind} must be a number between 0 and 1`);
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A deliberately small alias table.
 *
 * Applicants write "код" and catalogues write "computer_science"; without a
 * bridge the two never meet and every door looks like a mismatch. This is the
 * whole bridge — no embeddings, no model, no five-hundred-entry dictionary that
 * nobody can audit. Unknown vocabulary is kept as its own slug, so an exact
 * string match still works for anything the table has never heard of.
 */
const INTEREST_ALIASES: Readonly<Record<string, string>> = {
  "код": "programming",
  "кодинг": "programming",
  "программирование": "programming",
  "программист": "programming",
  "разработка": "programming",
  "coding": "programming",
  "software": "programming",
  "software engineering": "programming",
  "компьютеры": "computer_science",
  "информатика": "computer_science",
  "айти": "computer_science",
  "cs": "computer_science",
  "it": "computer_science",
  "computer science": "computer_science",
  "дизайн": "design",
  "графический дизайн": "design",
  "искусство": "design",
  "дизайн интерфейсов": "ux",
  "интерфейсы": "ux",
  "ui": "ux",
  "ui ux": "ux",
  "ux ui": "ux",
  "данные": "data_science",
  "аналитика": "data_science",
  "data science": "data_science",
  "математика": "mathematics",
  "math": "mathematics",
  "физика": "physics",
  "инженерия": "engineering",
  "инженер": "engineering",
  "бизнес": "business",
  "менеджмент": "business",
  "экономика": "economics",
  "финансы": "economics",
  "медицина": "medicine",
  "право": "law",
  "юриспруденция": "law",
  "естественные науки": "natural_sciences",
  "биология": "natural_sciences",
  "химия": "natural_sciences",
  "гуманитарные": "humanities",
  "история": "humanities",
  "педагогика": "education",
  "образование": "education",
  "архитектура": "architecture",
  "ветеринария": "veterinary",
  "сельское хозяйство": "agriculture",
  "искусство и культура": "arts",
  "лингвистика": "languages",
  "языки": "languages",
};

/**
 * Canonical tokens that sit close enough to each other that a hit on one is
 * real evidence for the other. Families are small and symmetric on purpose:
 * "programming" and "computer_science" are the same corridor of a university,
 * "programming" and "law" are not.
 */
const INTEREST_FAMILIES: readonly (readonly string[])[] = [
  ["programming", "computer_science", "data_science"],
  ["design", "ux", "arts", "architecture"],
  ["mathematics", "physics", "natural_sciences"],
  ["business", "economics"],
  ["medicine", "veterinary"],
  ["humanities", "languages", "law", "education"],
];

/** Language names an applicant might type, mapped onto ISO 639-1. */
const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  "английский": "en",
  "english": "en",
  "англ": "en",
  "русский": "ru",
  "russian": "ru",
  "казахский": "kk",
  "kazakh": "kk",
  "немецкий": "de",
  "german": "de",
  "deutsch": "de",
  "французский": "fr",
  "french": "fr",
  "турецкий": "tr",
  "turkish": "tr",
  "корейский": "ko",
  "korean": "ko",
  "китайский": "zh",
  "chinese": "zh",
};

const COUNTRY_CODE_BY_NAME: ReadonlyMap<string, string> = new Map(
  [...DESTINATIONS, ...HOME_COUNTRIES].map((country) => [country.name.toLowerCase(), country.code]),
);

/** Lowercased, punctuation-free, single-spaced. The input to every alias table. */
function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[_\-/,.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Maps a written interest or field onto a canonical token.
 *
 * Anything the table does not know keeps its own slug ("robotics" stays
 * "robotics"), so unknown vocabulary still matches itself exactly instead of
 * being silently dropped or guessed at.
 */
export function normalizeInterest(raw: string): string {
  const token = normalizeToken(raw);
  if (token === "") return "";
  return INTEREST_ALIASES[token] ?? token.replace(/ /g, "_");
}

export function normalizeLanguage(raw: string): string {
  const token = normalizeToken(raw);
  if (token === "") return "";
  return LANGUAGE_ALIASES[token] ?? token;
}

/** Two-letter codes pass through; known country names resolve to their code. */
export function normalizeCountry(raw: string): string {
  const trimmed = raw.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const byName = COUNTRY_CODE_BY_NAME.get(trimmed.toLowerCase());
  return byName ?? trimmed.toUpperCase();
}

function areRelatedInterests(a: string, b: string): boolean {
  if (a === b) return false;
  return INTEREST_FAMILIES.some((family) => family.includes(a) && family.includes(b));
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                    */
/* -------------------------------------------------------------------------- */

const FULL_FUNDING: readonly string[] = ["full_scholarship", "state_grant"];

/**
 * Profile against programme, with no reference to the calendar.
 *
 * Order matters: hard constraints first, because they decide whether the
 * programme is an option at all, then the soft dimensions, which only decide
 * where it sits in a list.
 */
export function matchProfileToProgram(profile: Profile, program: Program): MatchResult {
  const blockers: string[] = [];
  const reasons: string[] = [];
  const signals: string[] = [];
  const addSignal = (signal: string): void => {
    if (!signals.includes(signal)) signals.push(signal);
  };

  const wantedCountries = uniq(profile.countries.map(normalizeCountry).filter(nonEmpty));
  const programCountry = normalizeCountry(program.country);
  const profileLanguages = uniq(
    profile.languages.map((language) => normalizeLanguage(language.code)).filter(nonEmpty),
  );
  const programLanguages = uniq(program.language.map(normalizeLanguage).filter(nonEmpty));
  const fundedPlaceExists = program.funding.some((option) => FULL_FUNDING.includes(option));

  /* ---------------------------------------------------------------- */
  /* Hard constraints. Only what the applicant actually told us.       */
  /* ---------------------------------------------------------------- */

  // Funding. "Scholarship or nothing" is a statement about money the family
  // does not have, so a programme with no fully funded route is not an option.
  if (profile.constraints.needs_full_funding === true && !fundedPlaceExists) {
    blockers.push(
      `нужен полный вариант финансирования, а программа предлагает только: ${describeFunding(program)}`,
    );
  }

  // Relocation. `can_relocate: false` is the only statement in the model about
  // a country being out of reach. It is read against the applicant's own list
  // of countries, because that list is the only country data the profile holds;
  // with no list there is nothing to check and nothing is assumed.
  if (profile.constraints.can_relocate === false) {
    if (wantedCountries.length === 0) {
      addSignal("relocation_scope_unknown");
    } else if (!wantedCountries.includes(programCountry)) {
      blockers.push(`переезд невозможен, а программа находится в стране ${programCountry}`);
    }
  }

  // Stated tuition ceiling. A different currency is not a ceiling breach, it is
  // an unanswerable question: there is no exchange-rate layer in this project
  // and a made-up rate would be a made-up fact.
  const ceiling = profile.constraints.max_tuition_per_year;
  const tuition = program.tuition_per_year;
  if (ceiling !== undefined) {
    if (tuition === undefined) {
      // The university does not publish a price. A ceiling cannot be breached
      // by a number nobody has.
      addSignal("tuition_unknown");
    } else if (ceiling.currency !== tuition.currency) {
      addSignal("tuition_ceiling_currency_mismatch");
    } else if (tuition.amount > ceiling.amount && !fundedPlaceExists) {
      blockers.push(
        `стоимость ${formatCost(tuition.amount, tuition.currency)} в год выше указанного потолка ${formatCost(ceiling.amount, ceiling.currency)}`,
      );
    }
  }

  /* ---------------------------------------------------------------- */
  /* Requirements.                                                     */
  /* ---------------------------------------------------------------- */

  const matched: string[] = [];
  const unmatched: string[] = [];
  let decided = 0;

  for (const requirement of program.requirements) {
    const verdict = evaluateRequirement(requirement, profile, programLanguages);
    for (const signal of verdict.signals) addSignal(signal);

    if (verdict.status === "matched") {
      decided += 1;
      matched.push(requirement.id);
      reasons.push(`выполнено требование: ${requirement.label}`);
      continue;
    }

    unmatched.push(requirement.id);
    if (verdict.status === "unmatched") decided += 1;
    if (verdict.blocker !== undefined) blockers.push(verdict.blocker);
  }

  /* ---------------------------------------------------------------- */
  /* Soft dimensions.                                                  */
  /* ---------------------------------------------------------------- */

  /* Interest. The applicant chose these words themselves, which is why this
     dimension carries the most weight. */
  const wants = uniq(profile.interests.map(normalizeInterest).filter(nonEmpty));
  const offers = uniq(program.fields.map(normalizeInterest).filter(nonEmpty));
  let interestValue: number | null = null;
  if (wants.length === 0) addSignal("interests_unknown");
  else if (offers.length === 0) addSignal("program_fields_unknown");
  else {
    const exactHit = configuredHit("exact");
    const relatedHit = configuredHit("related");
    const hits: string[] = [];
    let total = 0;
    for (const want of wants) {
      let best = 0;
      for (const offer of offers) {
        const hit = offer === want ? exactHit : areRelatedInterests(want, offer) ? relatedHit : 0;
        if (hit > best) {
          best = hit;
          if (hit > 0 && !hits.includes(offer)) hits.push(offer);
        }
      }
      total += best;
    }
    interestValue = total / wants.length;
    if (hits.length > 0) {
      // Labels, not canonical tokens: "computer_science" is a word the engine
      // uses to think with, not a word to show a sixteen-year-old.
      reasons.push(
        `интересы совпадают с направлениями программы: ${hits.map(specialtyLabel).join(", ")}`,
      );
    }
  }

  /* Country. A preference and never a gate: a sixteen-year-old who has not yet
     thought of Poland should still be shown Poland. */
  let countryValue: number | null = null;
  if (wantedCountries.length === 0) addSignal("countries_unknown");
  else {
    const onTheList = wantedCountries.includes(programCountry);
    countryValue = onTheList ? 1 : 0;
    if (onTheList) reasons.push(`страна программы (${countryName(programCountry)}) есть в твоём списке`);
  }

  /* Language of instruction. One shared language is enough to study. */
  let languageValue: number | null = null;
  if (programLanguages.length === 0) addSignal("program_languages_unknown");
  else if (profileLanguages.length === 0) addSignal("language_unknown");
  else {
    const shared = programLanguages.filter((code) => profileLanguages.includes(code));
    languageValue = shared.length > 0 ? 1 : 0;
    if (shared.length > 0) {
      reasons.push(`язык обучения (${shared.map(languageName).join(", ")}) есть в профиле`);
    }
  }

  /* Funding. Whether a funded place exists at all, stated separately from the
     applicant's budget, because they are different facts about money. */
  let fundingValue: number | null = null;
  if (program.funding.length === 0) addSignal("funding_unknown");
  else if (fundedPlaceExists) {
    fundingValue = 1;
    reasons.push(`есть полный вариант финансирования: ${describeFunding(program)}`);
  } else if (program.funding.includes("partial")) {
    fundingValue = 0.5;
    reasons.push("есть частичное финансирование");
  } else {
    fundingValue = 0;
  }

  /* Other fit: money the applicant can compare, plus the share of requirements
     already covered. Each half is dropped when it cannot be decided. */
  const budget = profile.budget_per_year ?? profile.constraints.max_tuition_per_year;
  let budgetValue: number | null = null;
  let tuitionCompared = false;
  if (budget === undefined) addSignal("budget_not_stated");
  else if (tuition === undefined) {
    // Nothing to compare against: most universities in the catalogue publish no
    // figure at all, and the product will not put one there.
    addSignal("tuition_unknown");
    addSignal("budget_unknown");
  } else if (budget.currency !== tuition.currency) {
    // No exchange-rate data layer exists, so this comparison is simply not
    // available. The programme is not penalised for a question we cannot ask.
    addSignal("budget_currency_mismatch");
    addSignal("budget_unknown");
  } else {
    tuitionCompared = true;
    const affordable = tuition.amount <= budget.amount;
    budgetValue = affordable ? 1 : 0;
    if (affordable) {
      reasons.push(
        `стоимость ${formatCost(tuition.amount, tuition.currency)} в год укладывается в бюджет ${formatCost(budget.amount, budget.currency)}`,
      );
    }
  }

  const requirementValue = decided > 0 ? matched.length / decided : null;
  if (requirementValue === null && program.requirements.length > 0) {
    addSignal("requirements_undecidable");
  }
  const otherParts = [budgetValue, requirementValue].filter(isNumber);
  const otherValue =
    otherParts.length === 0
      ? null
      : otherParts.reduce((sum, part) => sum + part, 0) / otherParts.length;

  const values: Record<MatchDimension, number | null> = {
    interest: interestValue,
    country: countryValue,
    language: languageValue,
    funding: fundingValue,
    other_fit: otherValue,
  };
  const components: MatchComponent[] = DIMENSIONS.map((dimension) => ({
    dimension,
    weight: configuredWeight(dimension),
    value: values[dimension],
  }));

  return {
    score: scoreOf(components),
    hard_pass: blockers.length === 0,
    matched,
    unmatched,
    blockers,
    reasons,
    signals,
    components,
    tuition_compared: tuitionCompared,
  };
}

/**
 * Weighted mean over the dimensions that have data, rescaled to 0-100.
 *
 * Dimensions the inputs cannot decide are left out entirely rather than scored
 * as zero: a blank language field is not evidence against a programme, and
 * treating it as such would quietly punish every applicant who has not filled
 * the form in yet.
 */
function scoreOf(components: readonly MatchComponent[]): number {
  let weighted = 0;
  let applicable = 0;
  for (const component of components) {
    if (component.value === null) continue;
    applicable += component.weight;
    weighted += component.weight * clamp01(component.value);
  }
  if (applicable === 0) return 0;
  const score = Math.round((weighted / applicable) * 100);
  return Math.max(0, Math.min(100, score));
}

/* -------------------------------------------------------------------------- */
/* Requirements                                                                */
/* -------------------------------------------------------------------------- */

type RequirementStatus = "matched" | "unmatched" | "unknown";

interface RequirementVerdict {
  status: RequirementStatus;
  signals: string[];
  blocker?: string;
}

/**
 * One requirement against the profile.
 *
 * `unmatched` means the profile decides the question and the answer is no —
 * that is work still to do, and work is what the action chain is for, so it is
 * not a blocker. `unknown` means the profile cannot answer at all; it is listed
 * as not-yet-covered but excluded from the coverage ratio, because scoring a
 * blank field as a failure is the same lie as scoring it as a pass.
 *
 * The one requirement that does block is a language of instruction the
 * applicant explicitly does not have: an exam can be sat this autumn, a
 * language cannot be acquired on the way to a deadline.
 */
function evaluateRequirement(
  requirement: Requirement,
  profile: Profile,
  programLanguages: readonly string[],
): RequirementVerdict {
  const signals: string[] = [];

  if (requirement.kind === "language") {
    const code = normalizeLanguage(requirement.id);
    // A requirement whose id is one of the programme's languages of instruction
    // asks "do you speak it". Anything else (`ielts`, `toefl`) is a test, and
    // tests are handled below like any other exam.
    if (programLanguages.includes(code)) {
      if (profile.languages.length === 0) {
        return { status: "unknown", signals: [`${requirement.id}.unknown`] };
      }
      const held = profile.languages.find((language) => normalizeLanguage(language.code) === code);
      if (held === undefined) {
        const verdict: RequirementVerdict = { status: "unmatched", signals };
        if (requirement.required) {
          verdict.blocker = `в профиле нет обязательного языка обучения: ${requirement.label}`;
        }
        return verdict;
      }
      if (typeof requirement.value === "number") {
        if (typeof held.score !== "number") {
          return { status: "unknown", signals: [`${requirement.id}.level_unknown`] };
        }
        return { status: held.score >= requirement.value ? "matched" : "unmatched", signals };
      }
      return { status: "matched", signals };
    }
  }

  if (requirement.kind === "exam" || requirement.kind === "language") {
    if (profile.exams.length === 0) {
      return { status: "unknown", signals: [`${requirement.id}.unknown`] };
    }
    const held = profile.exams.find((exam) => exam.id === requirement.id);
    if (held === undefined) return { status: "unmatched", signals };
    if (held.status !== "taken" && held.status !== "completed") {
      return { status: "unmatched", signals: [`${requirement.id}.in_progress`] };
    }
    if (typeof requirement.value === "number") {
      if (typeof held.score !== "number") {
        return { status: "unknown", signals: [`${requirement.id}.score_unknown`] };
      }
      return { status: held.score >= requirement.value ? "matched" : "unmatched", signals };
    }
    return { status: "matched", signals };
  }

  // Documents, academic records and profile conditions have no counterpart in
  // the profile model. Guessing at them would be inventing facts about a
  // person, so they stay honestly undecided.
  return { status: "unknown", signals: [`${requirement.id}.unknown`] };
}

/* -------------------------------------------------------------------------- */
/* Door                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Match plus schedule, joined into the shape the screens read.
 *
 * `today` is required and never defaulted to the system clock: the whole engine
 * agrees on one day, and a test that depends on the day it runs is not a test.
 *
 * `status` is taken from the schedule alone, in the order the data forces:
 * `needs_data` when the chain cannot be computed honestly, `closed` when the
 * computed last day has passed, `closing_soon` when it is near, `open`
 * otherwise. A low score never closes a door and a high score never opens one —
 * a failed hard constraint is reported in `explanation_facts.blockers`, where
 * the applicant can read what it is, instead of being folded into a status that
 * describes time.
 */
export function matchProgram(
  profile: Profile,
  program: Program,
  actionsById: Record<string, ActionStep>,
  today: Iso,
): Door {
  const match = matchProfileToProgram(profile, program);
  const schedule = computePointOfNoReturn(program, actionsById, today);

  const reasons = [...match.reasons];
  const blockers = [...match.blockers];

  // Dates that reach a person are written the way a person reads them; the ISO
  // form stays in the data and in `Door.point_of_no_return`.
  const day = schedule.point_of_no_return === undefined
    ? ""
    : formatDateRu(schedule.point_of_no_return);

  switch (schedule.status) {
    case "needs_data":
      blockers.push(`не хватает данных для расчёта срока: ${schedule.missing_data.join(", ")}`);
      break;
    case "closed":
      blockers.push(
        `срок упущен: последний день, когда можно было начать, — ${day}`,
      );
      break;
    case "closing_soon":
      reasons.push(
        `дверь закрывается: начать нужно не позже ${day}, осталось дней — ${schedule.days_remaining}`,
      );
      break;
    case "open":
      reasons.push(`начать можно не позже ${day}`);
      break;
    default:
      break;
  }

  const door: Door = {
    program_id: program.id,
    status: schedule.status,
    action_chain: schedule.chain.map((entry) => entry.action_id),
    matched_requirements: match.matched,
    unmatched_requirements: match.unmatched,
    score: match.score,
    confidence: doorConfidence(program, schedule.chain, actionsById, match.tuition_compared),
    explanation_facts: { reasons, blockers },
  };

  if (schedule.point_of_no_return !== undefined) {
    door.point_of_no_return = schedule.point_of_no_return;
  }
  if (schedule.days_remaining !== undefined) door.days_remaining = schedule.days_remaining;
  if (schedule.critical_action_id !== undefined) {
    door.next_critical_action_id = schedule.critical_action_id;
  }

  return door;
}

/**
 * Weakest first.
 *
 * `derived` outranks `last_cycle`: a year computed from this cycle's published
 * day and month is closer to the truth than a whole date carried over from the
 * previous intake.
 */
const CONFIDENCE_RANK: Readonly<Record<Confidence, number>> = {
  demo: 0,
  last_cycle: 1,
  derived: 2,
  verified: 3,
};

/**
 * The weakest fact the door rests on.
 *
 * A door is exactly as trustworthy as its shakiest input, so one demo date
 * drags the whole thing down to `demo` and the UI has to say so. The tuition
 * fact counts only when it was actually used — an uncomparable price changed
 * nothing about this door and must not downgrade it.
 */
function doorConfidence(
  program: Program,
  chain: readonly { action_id: string }[],
  actionsById: Record<string, ActionStep>,
  tuitionCompared: boolean,
): Confidence {
  let weakest: Confidence = program.confidence ?? "demo";
  const consider = (confidence: Confidence): void => {
    if (CONFIDENCE_RANK[confidence] < CONFIDENCE_RANK[weakest]) weakest = confidence;
  };
  if (program.application_deadline !== undefined) consider(program.application_deadline.confidence);

  for (const entry of chain) {
    const hard = actionsById[entry.action_id]?.hard_deadline;
    if (hard !== undefined) consider(hard.confidence);
  }
  if (tuitionCompared && program.tuition_per_year !== undefined) {
    consider(program.tuition_per_year.confidence);
  }

  return weakest;
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

const FUNDING_RU: Readonly<Record<string, string>> = {
  state_grant: "государственный грант",
  full_scholarship: "полная стипендия",
  partial: "частичное финансирование",
  none: "без финансирования",
};

/** ISO codes are how the engine matches; names are how a person reads. */
function describeFunding(program: Program): string {
  if (program.funding.length === 0) return "нет данных";
  return program.funding.map((option) => FUNDING_RU[option] ?? option).join(", ");
}

function formatCost(amount: number, currency: Currency): string {
  return `${amount} ${currency}`;
}

function uniq(values: readonly string[]): string[] {
  const out: string[] = [];
  for (const value of values) if (!out.includes(value)) out.push(value);
  return out;
}

function nonEmpty(value: string): boolean {
  return value !== "";
}

function isNumber(value: number | null): value is number {
  return value !== null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
