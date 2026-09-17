import { formatDateRu } from "@/lib/date";
import { parseStatementWithRules } from "./fallback-parser";
import type {
  Conflict,
  DiffRequest,
  DiffResponse,
  ExplainRequest,
  ExplainResponse,
  FactConfidence,
  ParseResponse,
  ParsedProfileFields,
} from "./contracts";

/**
 * Everything the AI boundary does when there is no AI.
 *
 * This is not a degraded mode bolted on at the end — it is the floor the whole
 * product stands on. With no key, a timeout, a rate limit or a rejected
 * answer, these functions produce the response, and the applicant loses nothing
 * but the phrasing. Every value below comes from the applicant's own words or
 * from facts the engine already computed; none is invented here either.
 */

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/** Interests the old enum stands for, in the vocabulary the engine matches on. */
const INTEREST_FIELDS: Readonly<Record<string, string[]>> = {
  tech: ["programming", "computer_science"],
  engineering: ["engineering"],
  business: ["business", "economics"],
  natural_sciences: ["physics", "mathematics"],
  medicine: ["medicine"],
  social_law: ["law"],
  arts_design: ["design", "ux"],
};

/** Money as it is actually written: "1,5 млн ₸", "10 000 долларов", "$8k". */
const MONEY_PATTERNS: ReadonlyArray<readonly [RegExp, "KZT" | "USD" | "EUR", number]> = [
  [/(\d+(?:[.,]\d+)?)\s*(?:млн|миллион\w*)\s*(?:тенге|₸|kzt)/i, "KZT", 1_000_000],
  [/(\d+(?:[.,]\d+)?)\s*(?:тыс\.?|тысяч\w*)\s*(?:тенге|₸|kzt)/i, "KZT", 1_000],
  [/(\d[\d\s]{2,})\s*(?:тенге|₸|kzt)/i, "KZT", 1],
  [/(\d+(?:[.,]\d+)?)\s*(?:тыс\.?|тысяч\w*)\s*(?:доллар\w*|\$|usd)/i, "USD", 1_000],
  [/(\d[\d\s]{2,})\s*(?:доллар\w*|\$|usd)/i, "USD", 1],
  [/\$\s?(\d[\d\s]{2,})/i, "USD", 1],
  [/(\d+(?:[.,]\d+)?)\s*(?:тыс\.?|тысяч\w*)\s*(?:евро|€|eur)/i, "EUR", 1_000],
  [/(\d[\d\s]{2,})\s*(?:евро|€|eur)/i, "EUR", 1],
];

/** CEFR levels, only when the applicant names one. */
const LEVEL_PATTERN = /\b([ABC][12])\b/i;

/**
 * Words that name a language, not a country.
 *
 * The rule parser matches countries by substring, and "английский" contains
 * "англи" — so saying you speak English quietly added Great Britain to where
 * you want to study. A language is not a destination and never was; these words
 * are removed before the text is read for countries.
 */
const LANGUAGE_WORDS =
  /(английск|немецк|французск|турецк|китайск|корейск|казахск|русск|польск|чешск|венгерск)\w*/gi;

/**
 * The applicant's text, read by rules rather than by a model.
 *
 * Reuses the existing rule parser for what it already does well — countries,
 * class, exams, "только грант" — and adds the two things the new profile needs
 * and the old one never had: an exact amount with its currency, and a language
 * level. Nothing is derived beyond that: a budget band is never turned back
 * into a number, because "до 15 000" is not a statement that the family has
 * fifteen thousand.
 */
export function parseProfileDeterministically(text: string): ParseResponse {
  // "KZ" is passed as the home country on purpose. The rule parser recognises
  // Kazakh cities, and it cannot tell «я в Алматы» — where you live — from
  // «хочу в Казахстан» — where you want to study. Missing a stated country is
  // recoverable: the interview asks about countries anyway. Inventing one moves
  // the board on something the applicant never said.
  const legacy = parseStatementWithRules(text.replace(LANGUAGE_WORDS, " "), "KZ");
  const profile: ParsedProfileFields = {};
  const confidence: Record<string, FactConfidence> = {};
  const conflicts: Conflict[] = [];

  if (legacy.targetCountries.length > 0) {
    profile.countries = legacy.targetCountries;
    confidence.countries = "stated";
  }

  if (legacy.grade !== null && /^\d+$/.test(legacy.grade)) {
    profile.grade = Number(legacy.grade);
    confidence.grade = "stated";
  }

  if (legacy.interest !== null) {
    const fields = INTEREST_FIELDS[legacy.interest];
    if (fields !== undefined) {
      profile.interests = [...fields];
      // A reading of what they wrote, not a quotation of it.
      confidence.interests = "inferred";
    }
  }

  const exams: NonNullable<ParsedProfileFields["exams"]> = [];
  if (legacy.languageTest !== null && legacy.languageTest !== "none" && legacy.languageScore !== null) {
    exams.push({ id: legacy.languageTest, score: legacy.languageScore, status: "taken" });
    confidence.exams = "stated";
  }
  if (legacy.nationalScore !== null) {
    exams.push({ id: "ent", score: legacy.nationalScore, status: "taken" });
    confidence.exams = "stated";
  }
  if (exams.length > 0) profile.exams = exams;

  const amounts = readMoney(text);
  if (amounts.length === 1) {
    const [only] = amounts;
    if (only !== undefined) {
      profile.budget_per_year = only;
      confidence.budget_per_year = "stated";
    }
  } else if (amounts.length > 1) {
    // Two different sums in one text. Picking one would be inventing an answer
    // to a question the applicant has not settled.
    conflicts.push({
      field: "budget_per_year",
      values: amounts.map((money) => `${money.amount} ${money.currency}`),
      explanation: "В тексте названо больше одной суммы — уточни, какая из них на год обучения.",
    });
    confidence.budget_per_year = "unknown";
  }

  const level = LEVEL_PATTERN.exec(text);
  if (level?.[1] !== undefined && /англ|english/i.test(text)) {
    profile.languages = [{ code: "en", level: level[1].toUpperCase() }];
    confidence.languages = "stated";
  }

  if (legacy.budget === "scholarship_only") {
    profile.constraints = { needs_full_funding: true };
    confidence["constraints.needs_full_funding"] = "stated";
  }

  for (const field of [
    "grade",
    "interests",
    "countries",
    "budget_per_year",
    "languages",
    "exams",
  ]) {
    confidence[field] ??= "unknown";
  }

  return { profile, conflicts, confidence, fallback: true };
}

function readMoney(text: string): { amount: number; currency: "KZT" | "USD" | "EUR" }[] {
  const found: { amount: number; currency: "KZT" | "USD" | "EUR" }[] = [];

  for (const [pattern, currency, multiplier] of MONEY_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1] === undefined) continue;

    const raw = Number(match[1].replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(raw) || raw <= 0) continue;

    const amount = Math.round(raw * multiplier);
    if (found.some((item) => item.amount === amount && item.currency === currency)) continue;
    found.push({ amount, currency });
  }

  return found;
}

/* -------------------------------------------------------------------------- */
/* Explanations                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The explanation, written from the facts and nothing else.
 *
 * Every number in these sentences is interpolated from the request, so the
 * template passes the same grounding check the model's answer has to pass.
 */
export function templateExplain(request: ExplainRequest): ExplainResponse {
  const { door } = request;
  const parts: string[] = [];

  switch (door.status) {
    case "needs_data":
      parts.push(
        `По пути «${door.program_name}» пока не хватает данных, чтобы честно посчитать дату закрытия.`,
      );
      parts.push("Мы не подставляем догадку вместо даты — как только данные появятся, расчёт обновится.");
      break;

    case "closed":
      parts.push(
        door.point_of_no_return === undefined
          ? `Путь «${door.program_name}» в этом цикле уже не собрать по срокам.`
          : `Путь «${door.program_name}» уже закрыт: последний день, когда его можно было начать, — ${formatDateRu(door.point_of_no_return)}.`,
      );
      parts.push(
        "Это не значит, что туда нельзя поступить: значит, что цепочку обязательных шагов к дедлайну этого набора уже не успеть.",
      );
      break;

    case "closing_soon":
      parts.push(
        door.point_of_no_return === undefined
          ? `Путь «${door.program_name}» скоро закрывается.`
          : door.days_remaining === undefined
            ? `Путь «${door.program_name}» закрывается: начать нужно не позже ${formatDateRu(door.point_of_no_return)}.`
            : `Путь «${door.program_name}» закрывается: начать нужно не позже ${formatDateRu(door.point_of_no_return)}, осталось дней — ${door.days_remaining}.`,
      );
      if (door.next_critical_action !== undefined) {
        parts.push(`Всё держится на шаге «${door.next_critical_action}» — с него и начинается путь.`);
      }
      break;

    default:
      parts.push(
        door.point_of_no_return === undefined
          ? `Путь «${door.program_name}» открыт.`
          : `Путь «${door.program_name}» открыт: начать нужно не позже ${formatDateRu(door.point_of_no_return)}.`,
      );
      if (door.next_critical_action !== undefined) {
        parts.push(`Ближайший обязательный шаг — «${door.next_critical_action}».`);
      }
      break;
  }

  const reason = door.reasons[0];
  if (reason !== undefined) parts.push(`Почему подходит: ${reason.toLowerCase()}.`);

  const blocker = door.blockers[0];
  if (blocker !== undefined) parts.push(`Что мешает: ${blocker.toLowerCase()}.`);

  // The applicant is told exactly how much the date is worth, in the same
  // breath as the date. A derived year is useful and it is still ours.
  switch (door.confidence) {
    case "demo":
      parts.push("Данные по этой программе демонстрационные — перед подачей сверь их с сайтом.");
      break;
    case "last_cycle":
      parts.push("Даты — из прошлого цикла: новые вуз ещё не опубликовал, сверь их на сайте.");
      break;
    case "derived":
      parts.push("День и месяц — из источника, год выведен по циклу поступления.");
      break;
    case "verified":
      break;
  }

  return { text: parts.join(" "), grounded: true, fallback: true };
}

/* -------------------------------------------------------------------------- */
/* Differences                                                                 */
/* -------------------------------------------------------------------------- */

/** The change, stated. Counts come from the diff, never from a sentence. */
export function templateDiff(request: DiffRequest): DiffResponse {
  const { diff } = request;
  const reasons: string[] = [];

  if (diff.opened.length > 0) {
    reasons.push(`Открылось путей: ${diff.opened.length}.`);
  }
  if (diff.closed.length > 0) {
    reasons.push(`Закрылось путей: ${diff.closed.length}.`);
  }
  if (diff.became_data_available.length > 0) {
    reasons.push(`Появились данные по путям: ${diff.became_data_available.length}.`);
  }
  if (diff.became_data_missing.length > 0) {
    reasons.push(`Перестали считаться пути: ${diff.became_data_missing.length}.`);
  }
  if (diff.deadline_changes.length > 0) {
    reasons.push(`Сдвинулись сроки: ${diff.deadline_changes.length}.`);
  }
  if (diff.next_action_changed) {
    reasons.push(
      diff.new_next_action === undefined
        ? "Следующий шаг изменился."
        : `Следующий шаг теперь — «${diff.new_next_action}».`,
    );
  }

  const changed =
    request.old_value === undefined || request.new_value === undefined
      ? `Ты изменил поле «${request.changed_field}».`
      : `Ты изменил «${request.changed_field}»: ${request.old_value} → ${request.new_value}.`;

  const headline =
    reasons.length === 0
      ? `${changed} Набор путей и сроки остались прежними.`
      : `${changed} ${summarise(diff.opened.length, diff.closed.length)}`;

  return { headline, reasons, grounded: true, fallback: true };
}

function summarise(opened: number, closed: number): string {
  if (opened > 0 && closed > 0) return `Открылось ${opened}, закрылось ${closed}.`;
  if (opened > 0) return `Открылось путей: ${opened}.`;
  if (closed > 0) return `Закрылось путей: ${closed}.`;
  return "Изменились сроки и порядок шагов.";
}
