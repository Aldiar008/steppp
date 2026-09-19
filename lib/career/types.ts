/**
 * The career-interview module's own vocabulary.
 *
 * Transcribed from "Карьерное интервью: контентный пакет для разработки" —
 * every id, label and number below traces back to a specific line in that
 * document. Where the document only gives a qualitative table cell
 * ("выс.", "средн.", "↑↑", a category name), the numeric encoding chosen to
 * represent it lives next to the data that uses it (`fields.ts`,
 * `specializations/*.ts`) with a comment explaining the scheme — never here,
 * and never invented past what a reasonable, documented reading of the
 * qualitative cell requires.
 *
 * This module answers "which narrow specialization fits how this student
 * actually thinks" and stays deliberately separate from `lib/engine` (which
 * answers "which door is still reachable and when does it shut") — the two
 * are never imported into each other.
 */

/* -------------------------------------------------------------------------- */
/* Part 1 — the 16-dimension trait vector                                     */
/* -------------------------------------------------------------------------- */

/** §1.1 — "с чем человек проводит день". Each 0–100. */
export const FACET_IDS = ["O_PEOPLE", "O_LIFE", "O_MATTER", "O_DATA", "O_SYSTEM", "O_IMAGE"] as const;
export type FacetId = (typeof FACET_IDS)[number];

export const FACET_LABEL: Readonly<Record<FacetId, string>> = {
  O_PEOPLE: "Люди",
  O_LIFE: "Живое",
  O_MATTER: "Материя",
  O_DATA: "Данные",
  O_SYSTEM: "Системы",
  O_IMAGE: "Образы",
};

/** §1.2 — ten bipolar axes, each −100…+100. */
export const AXIS_IDS = [
  "A_ABS",
  "A_NEW",
  "A_SOC",
  "A_PREC",
  "A_RISK",
  "A_PHYS",
  "A_HORIZON",
  "A_INFL",
  "A_STAB",
  "A_SCALE",
] as const;
export type AxisId = (typeof AXIS_IDS)[number];

export const AXIS_LABEL: Readonly<Record<AxisId, { minus: string; plus: string }>> = {
  A_ABS: { minus: "Конкретное, руками, видимый результат", plus: "Абстрактное, в голове, модели и теории" },
  A_NEW: { minus: "Чинить и улучшать существующее", plus: "Создавать то, чего не было" },
  A_SOC: { minus: "Один, глубокая сосредоточенность", plus: "Среди людей, постоянный контакт" },
  A_PREC: { minus: "Импровизация, допустимая небрежность", plus: "Точность, регламент, цена ошибки высока" },
  A_RISK: { minus: "Предсказуемость, стабильный доход", plus: "Неопределённость, высокая ставка" },
  A_PHYS: { minus: "Экран и стол", plus: "Тело, поле, движение, улица" },
  A_HORIZON: { minus: "Быстрый результат, видно сегодня", plus: "Долгий горизонт, результат через годы" },
  A_INFL: { minus: "Исполнять, поддерживать", plus: "Убеждать, вести, отвечать за других" },
  A_STAB: { minus: "Понятный повторяемый порядок", plus: "Разнообразие, каждый день новый" },
  A_SCALE: { minus: "Помочь конкретному человеку", plus: "Повлиять на систему в масштабе" },
};

export type Facets = Record<FacetId, number>;
export type Axes = Record<AxisId, number>;

export interface TraitVector {
  facets: Facets;
  axes: Axes;
}

export function zeroFacets(): Facets {
  return Object.fromEntries(FACET_IDS.map((id) => [id, 0])) as Facets;
}

export function zeroAxes(): Axes {
  return Object.fromEntries(AXIS_IDS.map((id) => [id, 0])) as Axes;
}

export function zeroVector(): TraitVector {
  return { facets: zeroFacets(), axes: zeroAxes() };
}

/* -------------------------------------------------------------------------- */
/* Part 2 — the 11 broad fields                                               */
/* -------------------------------------------------------------------------- */

export const FIELD_IDS = ["ENG", "IT", "SCI", "MED", "BIZ", "LAW", "ART", "EDU", "ENV", "TRD", "SEC"] as const;
export type FieldId = (typeof FIELD_IDS)[number];

export const FIELD_LABEL: Readonly<Record<FieldId, string>> = {
  ENG: "Инженерия и конструирование",
  IT: "Информационные технологии",
  SCI: "Естественные и точные науки",
  MED: "Медицина и здоровье человека",
  BIZ: "Бизнес, экономика и финансы",
  LAW: "Право, политика, общественное управление",
  ART: "Искусство, дизайн и медиа",
  EDU: "Образование, психология, социальная работа",
  ENV: "Природа, агро и науки о Земле",
  TRD: "Прикладные профессии, производство, транспорт",
  SEC: "Безопасность, спорт и служба",
};

/* -------------------------------------------------------------------------- */
/* Part 3 — narrow specializations                                            */
/* -------------------------------------------------------------------------- */

/**
 * A local axis cell exactly as the document writes it — an arrow token or a
 * short category name (`§3`, columns like E1 "от молекулы до города" mix
 * both across the same field's table). Kept as the literal string rather
 * than forced onto one numeric scale the document never states, per
 * `lib/career/specializations/similarity.ts`'s comment.
 */
export type LocalAxisValue = string;

export interface Specialization {
  id: string;
  field: FieldId;
  label: string;
  /** Local axis id (e.g. "E1", "M3") → the document's own cell text. */
  localAxes: Readonly<Record<string, LocalAxisValue>>;
  /** The document's own "Что отличает от соседей" text, verbatim. */
  differentiator: string;
}

/* -------------------------------------------------------------------------- */
/* Part 1.3 — service fields                                                  */
/* -------------------------------------------------------------------------- */

export interface EvidenceEntry {
  /** Which axis or facet this shift was attributed to, or "AVERSION" / "PARENT_PRESSURE". */
  dimension: string;
  shift: number;
  quote: string;
  question_id: string;
}

export type InterviewStage = "stage1" | "stage2" | "stage3a" | "stage3b" | "result" | "crisis";

/* -------------------------------------------------------------------------- */
/* Persisted interview state — Part 11.1's session/profile schema             */
/* -------------------------------------------------------------------------- */

export type CareerAnswerSource = "stage1" | "stage2" | "stage3a" | "stage3b";

export interface CareerAnswerRecord {
  question_id: string;
  question_text: string;
  answer_text: string;
  source: CareerAnswerSource;
}

/** One field's stage-2 progress — reset whenever the active field changes. */
export interface CareerStage2State {
  field: FieldId;
  remaining: readonly string[];
  tally: Readonly<Record<string, number>>;
  askedBankIds: readonly string[];
  lastAxis?: string;
  stalledStreak: number;
  previousTopThree: readonly string[] | null;
}

export interface CareerWidenState {
  round: 0 | 1 | 2 | 3;
  /** What the student currently sees: a list of alternatives, or §7.2's one clarifying question. */
  phase: "list" | "clarify" | null;
  rejected: readonly { id: string; round: 1 | 2 | 3; reason?: string }[];
  /** The specialization id last shown as the leading result, before it was rejected. */
  lastRejectedId?: string;
  originField?: FieldId;
  /** Set once §7.2's clarifying question is answered, so the round-2 list can be recomputed from it. */
  clarifyBranch?: "what" | "where" | "how_long";
}

export interface CareerResultItemRecord {
  id: string;
  field: FieldId;
  label: string;
  why: string;
  hard: string;
}

export interface CareerResultState {
  items: readonly CareerResultItemRecord[];
  generated_at: string;
  source: "stage2" | "stage3a" | "stage3b";
}

export type CareerStage =
  | "idle"
  | "stage1"
  | "stage1_optional"
  | "stage2"
  | "stage3a"
  | "stage3b"
  | "result"
  | "crisis";

export interface CareerState {
  stage: CareerStage;
  vector: TraitVector;
  evidence: readonly EvidenceEntry[];
  /** Labels of matched AVERSION_RULES (see aversions.ts) — never the student's raw dealbreaker text. */
  aversionLabels: readonly string[];
  /** The union of every vetoed specialization id, kept alongside the labels so it survives a reload without recomputation. */
  vetoedIds: readonly string[];
  fieldBonuses: Readonly<Record<string, number>>;
  answers: readonly CareerAnswerRecord[];
  askedStage1Ids: readonly string[];
  candidateFields: readonly FieldId[];
  stage2: CareerStage2State | null;
  widen: CareerWidenState;
  stage3bHistory: readonly { question: string; answer: string }[];
  stage3bTurns: number;
  result: CareerResultState | null;
  crisisTriggered: boolean;
  monosyllabicStreak: number;
}

export function createDefaultCareerState(): CareerState {
  return {
    stage: "idle",
    vector: zeroVector(),
    evidence: [],
    aversionLabels: [],
    vetoedIds: [],
    fieldBonuses: {},
    answers: [],
    askedStage1Ids: [],
    candidateFields: [],
    stage2: null,
    widen: { round: 0, phase: null, rejected: [] },
    stage3bHistory: [],
    stage3bTurns: 0,
    result: null,
    crisisTriggered: false,
    monosyllabicStreak: 0,
  };
}

/** Total questions asked so far across stage 1 and stage 2 — the document's own §6.4 hard cap counts both together. */
export function totalAskedAcrossStage1And2(state: CareerState): number {
  return state.askedStage1Ids.length + (state.stage2?.askedBankIds.length ?? 0);
}
