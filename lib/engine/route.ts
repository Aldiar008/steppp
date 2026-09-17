/**
 * The route: a profile and a catalogue in, an ordered board of doors out.
 *
 *     Profile → Match → Schedule → Door → Summary → Next action
 *
 * The two layers below this one already answer their own question — `match`
 * says how well a programme fits, `schedule` says whether it can still be
 * reached. This module does no arithmetic of its own on either. It composes
 * them, puts the results in the order the applicant should read them, and
 * counts what is there.
 *
 * The ordering is the opinion this file does hold, and it is deliberate: doors
 * are sorted by *urgency*, never by prestige or by score. A modest programme
 * shutting in nine days belongs above a famous one shutting in seven months,
 * because only the first one can be lost this week. Score breaks ties inside a
 * date, and nothing else.
 *
 * Everything here is pure: no clock, no storage, no network, no React, no
 * model. `today` is an argument, so a server render, a browser render and a
 * test all produce the same board.
 *
 * One damaged record must not cost the applicant the rest of the catalogue, so
 * each programme is computed in isolation. A programme that cannot be read at
 * all becomes a `needs_data` door carrying the reason, exactly like a
 * programme whose chain cannot be dated.
 */
import type {
  ActionStep,
  Door,
  DoorStatus,
  Iso,
  NextActionResult,
  Profile,
  Program,
} from "@/lib/types";
import { getActiveDoors } from "./door-state";
import { matchProgram } from "./match";
import { computeNextBestAction } from "./next-action";
import { isIsoDate } from "./schedule";

/* -------------------------------------------------------------------------- */
/* Input                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Everything the engine knows about the world, as authored data.
 *
 * Actions arrive as a list because that is how a catalogue is written and
 * crawled; the engine indexes them once and then only ever looks them up.
 */
export interface Catalog {
  programs: Program[];
  actions: ActionStep[];
}

/**
 * The action catalogue as a lookup table, built once per run.
 *
 * The first entry for an id wins, so authored order stays authoritative and a
 * duplicate appended later cannot silently redefine a step the rest of the
 * catalogue already points at.
 */
export function buildActionIndex(actions: readonly ActionStep[]): Record<string, ActionStep> {
  const index: Record<string, ActionStep> = {};
  for (const action of actions) {
    if (!Object.prototype.hasOwnProperty.call(index, action.id)) index[action.id] = action;
  }
  return index;
}

/* -------------------------------------------------------------------------- */
/* Doors                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Every programme in the catalogue, matched, scheduled and ordered.
 *
 * `today` is validated here rather than trusted: it is the caller's argument,
 * so a malformed one is a programming error and throws. Catalogue data is the
 * opposite — it is out of the caller's hands, so damage there degrades to
 * `needs_data` instead of throwing.
 */
export function computeDoors(profile: Profile, catalog: Catalog, today: Iso): Door[] {
  if (!isIsoDate(today)) {
    throw new Error(`computeDoors: "today" is not an ISO date: ${String(today)}`);
  }
  return computeDoorsWith(profile, catalog.programs, buildActionIndex(catalog.actions), today);
}

/** The shared body, so `computeRoute` indexes the action catalogue only once. */
function computeDoorsWith(
  profile: Profile,
  programs: readonly Program[],
  actionsById: Record<string, ActionStep>,
  today: Iso,
): Door[] {
  const doors = programs.map((program, index) => {
    try {
      // A record with no id cannot be addressed by anything downstream — not a
      // link, not a comparison, not a saved plan — so it is damaged data even
      // though every other field might read fine.
      if (typeof program?.id !== "string" || program.id === "") {
        throw new Error("у записи нет идентификатора программы");
      }
      return matchProgram(profile, program, actionsById, today);
    } catch (error) {
      return unreadableDoor(program, index, error);
    }
  });
  return sortDoors(doors);
}

/**
 * A door for a record the engine could not read at all.
 *
 * It is not dropped and not guessed at: the applicant is told that an entry
 * exists and that the data behind it is broken, with the failure kept verbatim
 * so the catalogue can be fixed. `demo` is the weakest confidence there is,
 * which is the only honest thing to claim about a record that failed to parse.
 */
function unreadableDoor(program: Program | undefined, index: number, error: unknown): Door {
  const id =
    typeof program?.id === "string" && program.id !== "" ? program.id : `catalog_entry_${index}`;
  const detail = error instanceof Error ? error.message : String(error);
  return {
    program_id: id,
    status: "needs_data",
    action_chain: [],
    matched_requirements: [],
    unmatched_requirements: [],
    score: 0,
    confidence: "demo",
    explanation_facts: {
      reasons: [],
      blockers: [`запись каталога не читается: ${detail}`],
    },
  };
}

/**
 * Urgency first.
 *
 * `closing_soon` leads because those doors are lost within a fortnight if
 * nothing happens. `open` follows, earliest point of no return first. Doors
 * whose date could not be computed come next — they are work for the catalogue,
 * not for the applicant — and doors already gone come last.
 *
 * Every tie is broken all the way down to `program_id`, so the board is a total
 * order: the same catalogue always renders in the same sequence, on any engine
 * and any platform.
 */
const STATUS_ORDER: Readonly<Record<DoorStatus, number>> = {
  closing_soon: 0,
  open: 1,
  needs_data: 2,
  closed: 3,
};

export function sortDoors(doors: readonly Door[]): Door[] {
  return [...doors].sort(compareDoors);
}

function compareDoors(a: Door, b: Door): number {
  const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (byStatus !== 0) return byStatus;

  const byDate = comparePointOfNoReturn(a.point_of_no_return, b.point_of_no_return);
  if (byDate !== 0) return byDate;

  // Fit only ever breaks a tie between two doors that shut on the same day.
  if (a.score !== b.score) return b.score - a.score;

  return compareIds(a.program_id, b.program_id);
}

/** Earlier date first; a door with no computable date sorts after ones that have. */
function comparePointOfNoReturn(a: Iso | undefined, b: Iso | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a < b ? -1 : 1;
}

function compareIds(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

export interface DoorSummary {
  total: number;

  open: number;
  closing_soon: number;
  closed: number;
  needs_data: number;

  /** The active door that shuts first. Absent when none can be dated. */
  nearest?: Door;
}

/**
 * Counts, and the one date that matters most.
 *
 * `nearest` is chosen among active doors only and only from computed dates —
 * an undated door has no place in a countdown. Ties fall back to the board
 * order, so the summary always names the same door the list shows first.
 */
export function summarizeDoors(doors: readonly Door[]): DoorSummary {
  const summary: DoorSummary = {
    total: doors.length,
    open: 0,
    closing_soon: 0,
    closed: 0,
    needs_data: 0,
  };

  for (const door of doors) summary[door.status] += 1;

  let nearest: Door | undefined;
  for (const door of getActiveDoors(doors)) {
    if (door.point_of_no_return === undefined) continue;
    if (nearest === undefined || compareDoors(door, nearest) < 0) nearest = door;
  }
  if (nearest !== undefined) summary.nearest = nearest;

  return summary;
}

/* -------------------------------------------------------------------------- */
/* Whole route                                                                 */
/* -------------------------------------------------------------------------- */

export interface RouteResult {
  doors: Door[];
  summary: DoorSummary;
  next_action?: NextActionResult;
}

/**
 * Everything a screen needs from one call, over one shared action index.
 *
 * The parts stay available separately — a screen that only lists doors should
 * not have to compute a next action to get them. `completedActionIds` is passed
 * straight through: the engine holds no state of its own, so whoever knows what
 * the applicant has already done has to say so.
 */
export function computeRoute(
  profile: Profile,
  catalog: Catalog,
  today: Iso,
  completedActionIds?: ReadonlySet<string>,
): RouteResult {
  if (!isIsoDate(today)) {
    throw new Error(`computeRoute: "today" is not an ISO date: ${String(today)}`);
  }

  const actionsById = buildActionIndex(catalog.actions);
  const doors = computeDoorsWith(profile, catalog.programs, actionsById, today);

  const result: RouteResult = { doors, summary: summarizeDoors(doors) };
  const next = computeNextBestAction(doors, actionsById, completedActionIds, today);
  if (next !== null) result.next_action = next;

  return result;
}
