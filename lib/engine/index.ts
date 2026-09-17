/**
 * The deterministic core.
 *
 * Nothing in this folder reads a clock without being told to, calls a network,
 * touches React or a browser API, or asks a language model anything. Same
 * inputs, same dates, every time — that property is what lets the product
 * promise that no date is invented.
 *
 * The public entry point is `computeRoute` (or `computeDoors` on its own):
 *
 *     Profile → Match → Schedule → Door → Summary → Next action
 *
 * The two layers underneath stay exported because they are engine functions in
 * their own right, with their own tests, and because a screen sometimes needs
 * to ask one question rather than the whole board. `leverage`, `diff` and
 * `roadmap` will be added next, each on top of these.
 */
export {
  buildActionIndex,
  computeDoors,
  computeRoute,
  sortDoors,
  summarizeDoors,
  type Catalog,
  type DoorSummary,
  type RouteResult,
} from "./route";

export {
  getActiveDoors,
  getClosedDoors,
  getClosingSoonDoors,
  getNeedsDataDoors,
  getOpenDoors,
  getReachableDoors,
  isActiveDoor,
  isDoorReachable,
} from "./door-state";

export { computeNextBestAction } from "./next-action";

export type {
  ActionUrgency,
  NextActionReason,
  NextActionResult,
} from "@/lib/types";

export { computeLeverage, getTopLeverage, type LeverageCandidate } from "./leverage";

export { diffDoorSets, diffRoutes } from "./diff";

export type {
  DeadlineImpact,
  DiffResult,
  NextActionChange,
  RouteDiff,
  ScoreChange,
} from "@/lib/types";

export {
  applyInterviewAnswer,
  candidateValuesOf,
  findQuestion,
  selectNextQuestion,
  unknownProfileFields,
  INFLUENCE_WEIGHTS,
  MAX_ADAPTIVE_QUESTIONS,
  QUESTION_INFLUENCE_THRESHOLD,
  type QuestionDefinition,
  type QuestionScale,
  type QuestionOption,
  type QuestionSelection,
  type SelectorOptions,
} from "./questions";

export {
  applyProfileChange,
  isProfileFieldKnown,
  readProfileField,
  readProfileFieldValue,
  PROFILE_FIELDS,
  type ProfileChange,
  type ProfileField,
} from "./profile-patch";

export {
  CLOSING_SOON_DAYS,
  computeLatestStartDate,
  computePointOfNoReturn,
  isIsoDate,
  statusFor,
  type ScheduleChainEntry,
  type ScheduleResult,
  type ScheduleStatus,
} from "./schedule";

export {
  matchProfileToProgram,
  matchProgram,
  normalizeCountry,
  normalizeInterest,
  normalizeLanguage,
  type MatchComponent,
  type MatchDimension,
  type MatchResult,
} from "./match";
