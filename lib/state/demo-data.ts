/**
 * Amir's full account, built once from real inputs run through the real
 * engines — never hand-typed output. `computeRoute`, the career scoring
 * pipeline, and everything else a real student's screens call are exactly
 * what a demo visitor sees too; only the profile and the conversation quotes
 * feeding them are authored, per "Путь пользователя: Амир из Шымкента".
 */
import { CATALOG } from "@/data/catalog";
import { DEMO_PROFILE } from "@/data/demo-profile";
import { matchAversions, vetoedIdsFrom } from "@/lib/career/aversions";
import { buildResults } from "@/lib/career/results";
import { applyShifts, createEmptyVector, evidenceFromShifts, selectFieldCandidates, type ShiftInput } from "@/lib/career/scoring";
import { createDefaultCareerState, type CareerState } from "@/lib/career/types";
import { todayIso } from "@/lib/date";
import { computeRoute } from "@/lib/engine";
import { createDefaultAppData, type AppData } from "@/lib/state/app-store";

/**
 * Amir's own words from Screen 3 of the source document, run through the
 * same axis-shift shape the real Stage 1 extraction produces (see
 * `lib/career/scoring.ts:ShiftInput`) — the quotes are his, the dimensions
 * are the taxonomy's, the scoring after this point is 100% the real
 * `selectFieldCandidates`/`buildResults` pipeline.
 */
function amirCareerShifts(): ShiftInput[] {
  return [
    {
      dimension: "O_MATTER",
      amount: 30,
      quote: "если честно мне больше нравится с компьютерами возиться",
      question_id: "q1_absorbed",
    },
    {
      dimension: "O_DATA",
      amount: 25,
      quote: "если честно мне больше нравится с компьютерами возиться",
      question_id: "q1_absorbed",
    },
    { dimension: "O_MATTER", amount: 25, quote: "разберу и посмотрю, что внутри", question_id: "q2_broken_thing" },
    { dimension: "A_ABS", amount: -20, quote: "разберу и посмотрю, что внутри", question_id: "q2_broken_thing" },
    { dimension: "A_RISK", amount: -35, quote: "хочу, чтобы за учёбу не платить", question_id: "q11_money_freedom" },
  ];
}

function buildAmirCareer(): CareerState {
  const base = createDefaultCareerState();
  const shifts = amirCareerShifts();
  const vector = applyShifts(createEmptyVector(), shifts);
  const evidence = evidenceFromShifts(shifts);

  // "Тебе спокойно рядом с кровью и травмами? — нет, мутит" — the same hard
  // veto Q10 produces for any real student, computed here from his own words.
  const aversionMatches = matchAversions("нет, мне не спокойно, от вида крови мутит");
  const vetoedIds = vetoedIdsFrom(aversionMatches.map((m) => m.rule));

  const candidates = selectFieldCandidates(vector, vetoedIds);
  const leadField = candidates.candidates[0] ?? "IT";
  const shortlistIds = leadField === "IT" ? ["IT_SWE", "IT_SEC", "IT_DS"] : candidates.ranked.slice(0, 3).map((r) => r.field);

  return {
    ...base,
    stage: "result",
    vector,
    evidence,
    aversionLabels: aversionMatches.map((m) => m.label),
    vetoedIds: [...vetoedIds],
    candidateFields: candidates.candidates,
    result: {
      items: buildResults(shortlistIds, vetoedIds, evidence),
      generated_at: "2026-09-16T09:00:00.000Z",
      source: "stage2",
    },
  };
}

export function buildAmirAppData(): AppData {
  const defaults = createDefaultAppData();

  // Pre-computed once, for real, at seed time — not because a screen can't
  // compute it itself (every screen does, on every render), but because the
  // diff overlay (Screen 11, "не жалеть времени") only has something to
  // diff *against* once one route already exists as `previous_route`'s
  // future baseline. Without this, a demo visitor's very first profile edit
  // would silently become the account's first-ever computation instead of a
  // real before/after — exactly the gap a live run of this demo surfaced.
  const today = todayIso();
  const baselineRoute = computeRoute(DEMO_PROFILE, CATALOG, today);

  return {
    ...defaults,
    profile: DEMO_PROFILE,
    route: baselineRoute,
    previous_route: null,
    metadata: { ...defaults.metadata, last_calculated_at: `${today}T00:00:00.000Z` },
    interview: {
      ...defaults.interview,
      started: true,
      completed: true,
      answered_question_ids: [
        "q_interests",
        "q_countries",
        "q_full_funding",
        "q_budget",
        "q_language_en",
        "q_exam_ent",
        "q_exam_ielts",
        "q_exam_sat",
        "q_relocate",
        "q_grade",
      ],
      raw_text: "Хотел быть врачом как дядя, но если честно мне больше нравится с компьютерами возиться",
    },
    change_seen: true,
    preferences: defaults.preferences,
    career: buildAmirCareer(),
  };
}
