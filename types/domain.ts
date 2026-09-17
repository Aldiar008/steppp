/**
 * Stepwise domain model.
 *
 * Two hard rules encoded in these types:
 *
 * 1. Every date the product shows comes from `Pathway` data that carries a
 *    `Verification`. There is no field anywhere that holds an AI-produced date.
 * 2. Fit is never a probability. It is a band plus a list of signed, labelled
 *    factors, so the UI can always answer "why this one".
 */

export type Iso = string; // "YYYY-MM-DD"

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

export type Grade = "9" | "10" | "11" | "12" | "graduated" | "gap_year";

export type BudgetBand =
  | "scholarship_only"
  | "under_5k"
  | "under_15k"
  | "under_30k"
  | "over_30k";

export type InterestField =
  | "tech"
  | "engineering"
  | "business"
  | "natural_sciences"
  | "medicine"
  | "social_law"
  | "arts_design"
  | "undecided";

export type LanguageTest = "none" | "ielts" | "toefl" | "duolingo" | "other";

export interface ExamState {
  /** National school-leaving exam score, in the units of the home country. */
  nationalScore: number | null;
  /** Whether the national exam has actually been taken or is only planned. */
  nationalTaken: boolean;
  gpa: number | null;
  sat: number | null;
  /** Which English test the applicant holds, `none` if none yet. */
  languageTest: LanguageTest;
  /** IELTS band (0-9) or TOEFL total (0-120), interpreted per `languageTest`. */
  languageScore: number | null;
}

export interface Profile {
  /** Free text the applicant typed about themselves. Kept verbatim. */
  rawStatement: string;
  homeCountry: string;
  grade: Grade;
  /** Calendar year the applicant intends to start studying. */
  intakeYear: number;
  targetCountries: string[];
  interest: InterestField;
  budget: BudgetBand;
  exams: ExamState;
  /** Competence axes 0-100, produced by the diagnostic test. */
  strengths: Record<string, number>;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Verified data                                                               */
/* -------------------------------------------------------------------------- */

export interface Source {
  label: string;
  url: string;
}

/**
 * Provenance for every date in the catalogue.
 *
 * `demo` means: the date is plausible and the source link is real, but nobody
 * on this team has opened that page and confirmed it for this intake year. The
 * UI must say so. `verified` may only be set together with a `verifiedAt` date.
 */
export type Verification =
  | { status: "demo"; source: Source; verifiedAt: null; note?: string }
  | { status: "verified"; source: Source; verifiedAt: Iso; note?: string };

/* -------------------------------------------------------------------------- */
/* Pathways                                                                    */
/* -------------------------------------------------------------------------- */

export type RequirementKind =
  | "exam"
  | "language"
  | "registration"
  | "document"
  | "application"
  | "finance";

/**
 * One obligatory step on a pathway.
 *
 * `hardDeadline` is the last calendar date the step itself can be completed.
 * `leadTimeDays` is how long the step takes once started, so the latest moment
 * the applicant can still begin it is `hardDeadline - leadTimeDays`.
 */
/**
 * Something already in the profile that makes a requirement moot, so the plan
 * does not ask an applicant who holds IELTS 7.5 to go and sit IELTS.
 */
export type SatisfiedBy = "english" | "national_exam" | "sat";

export interface Requirement {
  id: string;
  kind: RequirementKind;
  label: string;
  /** What the applicant physically does, phrased as an instruction. */
  action: string;
  hardDeadline: Iso;
  leadTimeDays: number;
  /** A first concrete move that fits in about 15 minutes. */
  firstStep: string;
  /**
   * Identifies work that counts for several pathways at once. Doing one IELTS
   * sitting serves every route sharing the key, which is what lets the product
   * say how many doors a single action keeps open.
   */
  sharedKey: string | null;
  satisfiedBy: SatisfiedBy | null;
  verification: Verification;
}

export type EligibilityKey = "budget" | "grade" | "language" | "exam";

/**
 * Declarative gates. Kept as plain data rather than predicate functions so a
 * pathway stays serialisable and the blocker text can be generated in one place.
 */
export interface PathwayConstraints {
  /**
   * Realistic yearly out-of-pocket cost including living, in USD. Compared
   * against the applicant budget band.
   */
  yearlyCostUsd: number;
  /** Grades this route is still reachable from. Null means any. */
  allowedGrades: Grade[] | null;
  /** Route depends on a national school-leaving exam result. */
  requiresNationalExam: boolean;
  /** Minimum English level on the IELTS scale. Null when English is not used. */
  minIeltsEquivalent: number | null;
  /** A non-English language the route requires, shown as a named risk. */
  additionalLanguage: string | null;
}

export interface Pathway {
  id: string;
  /** Short name the applicant sees, e.g. "Германия · TU через Studienkolleg". */
  title: string;
  country: string;
  /** One line on what this route actually is. */
  summary: string;
  /** Sticker price of tuition in USD per year, 0 for tuition-free systems. */
  tuitionUsdPerYear: number;
  /** Whether a place covering full cost is a normal outcome on this route. */
  fundedPlacesExist: boolean;
  fields: InterestField[];
  /** How hard the route is to win, used only to weight the academic factor. */
  selectivity: "standard" | "medium" | "high";
  constraints: PathwayConstraints;
  requirements: Requirement[];
  verification: Verification;
}

/* -------------------------------------------------------------------------- */
/* Engine output                                                               */
/* -------------------------------------------------------------------------- */

export type DoorStatus = "open" | "at_risk" | "critical" | "closed" | "blocked";

export interface FitFactor {
  /** Short label shown in the "why" list. */
  label: string;
  /** Signed contribution. Displayed as a direction, never summed into a %. */
  delta: number;
  detail: string;
}

export type FitBand = "strong" | "moderate" | "weak";

export interface Blocker {
  key: EligibilityKey;
  explain: string;
}

/** A requirement placed on the calendar by backward planning. */
export interface PlannedStep {
  requirement: Requirement;
  /** Last date the applicant can still start and finish in time. */
  latestStart: Iso;
  /** Days from today until `latestStart`. Negative means already missed. */
  daysUntilLatestStart: number;
  done: boolean;
  /** True for the step that defines the pathway point of no return. */
  binding: boolean;
}

export interface Door {
  pathway: Pathway;
  status: DoorStatus;
  /**
   * Point of no return: the last date on which this pathway is still
   * achievable. Null when the pathway is blocked outright by eligibility.
   */
  pointOfNoReturn: Iso | null;
  daysLeft: number | null;
  /** The requirement that will close the door first. */
  bindingStep: PlannedStep | null;
  plan: PlannedStep[];
  fitBand: FitBand;
  fitFactors: FitFactor[];
  blockers: Blocker[];
}

export interface NextAction {
  doorId: string;
  doorTitle: string;
  requirementId: string;
  /** The 15-minute move. */
  title: string;
  why: string;
  /** How many still-viable doors this single action keeps open. */
  keepsDoorsOpen: number;
  deadline: Iso;
  daysLeft: number;
}

export interface RoadmapItem {
  /** Shared key when the work counts for several doors, else requirement id. */
  key: string;
  requirement: Requirement;
  latestStart: Iso;
  daysUntilLatestStart: number;
  doors: { id: string; title: string }[];
  done: boolean;
}

export interface RoadmapMonth {
  /** "YYYY-MM" */
  month: string;
  items: RoadmapItem[];
}

/* -------------------------------------------------------------------------- */
/* Diff                                                                        */
/* -------------------------------------------------------------------------- */

export interface DoorDelta {
  doorId: string;
  title: string;
  before: DoorStatus;
  after: DoorStatus;
  pnrBefore: Iso | null;
  pnrAfter: Iso | null;
  /** Positive means the deadline moved later, i.e. pressure eased. */
  pnrShiftDays: number | null;
}

export interface ProfileChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface ChangeReport {
  changes: ProfileChange[];
  opened: DoorDelta[];
  closed: DoorDelta[];
  shifted: DoorDelta[];
  nextActionBefore: NextAction | null;
  nextActionAfter: NextAction | null;
  openCountBefore: number;
  openCountAfter: number;
}
