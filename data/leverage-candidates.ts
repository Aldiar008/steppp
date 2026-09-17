/**
 * The changes the engine is allowed to imagine.
 *
 * Counterfactual analysis needs a closed list: the engine re-runs the whole
 * route once per entry here and reports what each one buys. Keeping the list
 * authored rather than generated is the point — a made-up change would produce
 * a made-up number of doors, and this is the one screen where an applicant
 * decides what to spend their autumn on.
 *
 * `effort_minutes` and `preparation_days` are **authored estimates**, demo
 * grade for now, and the engine treats them as data: it never invents them and
 * never adjusts them. A change whose effort is unknown is reported as
 * unrankable rather than guessed at.
 *
 * Only fields `applyProfileChange` supports may appear here, and the type below
 * enforces that at compile time.
 */
import type { ProfileChange } from "@/lib/engine/profile-patch";

interface CandidateBase {
  id: string;
  title: string;
  description?: string;
  /** Minutes of the applicant's own work. `0` means a decision, not a task. */
  effort_minutes: number;
  /** Calendar days the change needs before it can be true. */
  preparation_days?: number;
}

/**
 * A change, typed by the field it touches.
 *
 * The field/value half is `ProfileChange`, shared with the interview and with
 * `applyProfileChange`, so a candidate can only name a field the engine can
 * actually write.
 *
 * There is deliberately no `from` field. The old value is read from the profile
 * the engine actually holds, so an authored expectation can never disagree with
 * what the applicant really entered.
 */
export type LeverageCandidate = CandidateBase & ProfileChange;

/**
 * Eleven realistic moves for a school leaver from Kazakhstan.
 *
 * The set stays small on purpose: every entry costs a full route computation,
 * and a list of forty changes is not a decision an applicant can make anyway.
 */
export const LEVERAGE_CANDIDATES: readonly LeverageCandidate[] = [
  {
    id: "lang_en_b2",
    title: "Подтвердить английский на уровне B2",
    description: "Программы с обучением на английском требуют язык как условие допуска.",
    field: "languages",
    to: { code: "en", level: "B2" },
    effort_minutes: 2_400,
    preparation_days: 120,
  },
  {
    id: "exam_ielts_65",
    title: "Сдать IELTS на 6.5",
    description: "Закрывает требование по языковому экзамену там, где он указан отдельно.",
    field: "exams",
    to: { id: "ielts", score: 6.5, status: "taken" },
    effort_minutes: 900,
    preparation_days: 60,
  },
  {
    id: "lang_de_b1",
    title: "Подтвердить немецкий на уровне B1",
    field: "languages",
    to: { code: "de", level: "B1" },
    effort_minutes: 3_000,
    preparation_days: 180,
  },
  {
    id: "exam_sat_1300",
    title: "Сдать SAT на 1300",
    field: "exams",
    to: { id: "sat", score: 1_300, status: "taken" },
    effort_minutes: 1_800,
    preparation_days: 90,
  },
  {
    id: "funding_accept_paid",
    title: "Рассмотреть программы без полного гранта",
    description: "Снимает условие «только полное финансирование».",
    field: "constraints.needs_full_funding",
    to: false,
    effort_minutes: 30,
  },
  {
    id: "relocation_ready",
    title: "Согласиться на переезд",
    description: "Решение, а не задача: минут работы оно не требует.",
    field: "constraints.can_relocate",
    to: true,
    effort_minutes: 0,
  },
  {
    id: "country_add_pl",
    title: "Добавить Польшу в список стран",
    field: "countries",
    to: ["PL"],
    effort_minutes: 20,
  },
  {
    id: "country_add_de",
    title: "Добавить Германию в список стран",
    field: "countries",
    to: ["DE"],
    effort_minutes: 20,
  },
  {
    id: "budget_6k",
    title: "Найти 6 000 USD в год",
    field: "budget_per_year",
    to: { amount: 6_000, currency: "USD" },
    effort_minutes: 240,
    preparation_days: 90,
  },
  {
    id: "ceiling_8k",
    title: "Поднять потолок стоимости до 8 000 USD",
    field: "constraints.max_tuition_per_year",
    to: { amount: 8_000, currency: "USD" },
    effort_minutes: 240,
    preparation_days: 90,
  },
  {
    id: "interest_cs",
    title: "Добавить Computer Science в интересы",
    description: "Меняет соответствие профилю, но само по себе ничего не открывает.",
    field: "interests",
    to: ["computer_science"],
    effort_minutes: 10,
  },
];
