import { DESTINATIONS } from "@/data/countries";
import type { ParsedProfile } from "./schema";

/**
 * Deterministic parser used when no AI key is configured, or when the model
 * call fails.
 *
 * It is deliberately dumber than the model: it looks for country names, a class
 * number, a budget figure and an exam score, and admits everything else in
 * `unclear`. The point is that the interview never dead-ends because a network
 * call did, and that a demo laptop with no credentials still shows the product.
 *
 * No `\b` anywhere below. In JavaScript `\w` is ASCII-only, so a word boundary
 * never forms next to a Cyrillic letter and every Russian pattern written with
 * `\b` silently matches nothing. Latin-only patterns use an explicit
 * `(?![a-z])` guard instead.
 */

const COUNTRY_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/(сша|америк|штат|usa)/i, "US"],
  [/(великобритан|англи|британ|uk(?![a-z]))/i, "GB"],
  [/(герман|немецк|deutschland)/i, "DE"],
  [/(нидерланд|голланд)/i, "NL"],
  [/(польш|polska|poland)/i, "PL"],
  [/(чехи|чешск|czech)/i, "CZ"],
  [/(турци|турецк|turkey)/i, "TR"],
  [/(коре|korea)/i, "KR"],
  [/(кита|китай|china)/i, "CN"],
  [/(оаэ|эмират|дуба)/i, "AE"],
  [/(венгри|hungar)/i, "HU"],
  [/(казахстан|алмат|астан|шымкент|караганд)/i, "KZ"],
];

const INTEREST_ALIASES: ReadonlyArray<readonly [RegExp, ParsedProfile["interest"]]> = [
  [/(программир|айти|кодин|software|компьютер|данн|data\b|it(?![a-z]))/i, "tech"],
  [/(инженер|механик|электрон|робот|строитель)/i, "engineering"],
  [/(бизнес|экономик|финанс|маркетин|менеджмент)/i, "business"],
  [/(физик|хими|биолог|математик)/i, "natural_sciences"],
  [/(медицин|врач|стоматолог|фармац)/i, "medicine"],
  [/(юрис|правов|политолог|социолог|международн)/i, "social_law"],
  [/(дизайн|архитектур|искусств|музык|кино)/i, "arts_design"],
];

/** Spelled-out amounts, because "тысяч десять" is how people actually write. */
const SPELLED_THOUSANDS: ReadonlyArray<readonly [RegExp, number]> = [
  [/(двадцать пять|двадцать|тридцать)/i, 25],
  [/(пятнадцать|пятнадцати)/i, 15],
  [/(десять|десяти|десятк)/i, 10],
  [/(пять|пяти)\s*тысяч/i, 5],
];

export function parseStatementWithRules(text: string, homeCountry?: string): ParsedProfile {
  const unclear: string[] = [];

  /* Countries mentioned anywhere in the text. */
  const known = new Set(DESTINATIONS.map((c) => c.code));
  const targetCountries: string[] = [];
  for (const [pattern, code] of COUNTRY_ALIASES) {
    // The home country is skipped: naming your own city ("Я в Алматы") is not a
    // statement of intent, and this parser has no way to tell the two apart.
    // The route stays on the board regardless, since target countries only
    // weight fit, and one tap in the profile adds it back.
    if (code === homeCountry) continue;
    if (pattern.test(text) && known.has(code) && !targetCountries.includes(code)) {
      targetCountries.push(code);
    }
  }

  /* Grade. */
  let grade: ParsedProfile["grade"] = null;
  const gradeMatch = /(?:^|[^\d])(9|10|11|12)\s*[-]?\s*(?:й|ый|м|ом)?\s*класс/i.exec(text);
  if (gradeMatch?.[1]) {
    grade = gradeMatch[1] as ParsedProfile["grade"];
  } else if (/(закончил|окончил|выпустил|аттестат уже)/i.test(text)) {
    grade = "graduated";
  } else if (/(gap\s*year|академ)/i.test(text)) {
    grade = "gap_year";
  }

  /* Budget. */
  let budget: ParsedProfile["budget"] = null;
  if (/(только\s+стипенди|без\s+денег|нет\s+денег|нужен\s+грант|грант\s+обязательн)/i.test(text)) {
    budget = "scholarship_only";
  } else {
    const thousands = readThousands(text);
    if (thousands !== null) {
      if (thousands <= 5) budget = "under_5k";
      else if (thousands <= 15) budget = "under_15k";
      else if (thousands <= 30) budget = "under_30k";
      else budget = "over_30k";
    }
  }

  /* Field of study. */
  let interest: ParsedProfile["interest"] = null;
  for (const [pattern, value] of INTEREST_ALIASES) {
    if (pattern.test(text)) {
      interest = value;
      break;
    }
  }

  /* Language test. */
  let languageTest: ParsedProfile["languageTest"] = null;
  let languageScore: number | null = null;
  const ielts = /ielts\D{0,12}(\d(?:[.,]\d)?)/i.exec(text);
  const toefl = /toefl\D{0,12}(\d{2,3})/i.exec(text);
  if (ielts?.[1]) {
    languageTest = "ielts";
    languageScore = Number(ielts[1].replace(",", "."));
  } else if (toefl?.[1]) {
    languageTest = "toefl";
    languageScore = Number(toefl[1]);
  } else if (/(ielts|toefl|айлтс)/i.test(text)) {
    languageTest = "none";
    unclear.push("Языковой экзамен упомянут без балла");
  }

  /* National exam. */
  let nationalScore: number | null = null;
  let nationalTaken: boolean | null = null;
  const notTakenYet = /(ещё не сдав|еще не сдав|не сдавал|планиру|буду сдавать|собираюсь сдав)/i;
  const exam = /(ент|егэ|орт|нмт|дтм|нцт)/i;
  const examWithScore = /(?:ент|егэ|орт|нмт|дтм|нцт)\D{0,15}(\d{2,4})/i.exec(text);

  if (examWithScore?.[1]) {
    nationalScore = Number(examWithScore[1]);
    nationalTaken = !notTakenYet.test(text);
  } else if (exam.test(text)) {
    nationalTaken = notTakenYet.test(text) ? false : null;
    unclear.push("Экзамен упомянут без балла");
  }

  const sat = /sat\D{0,12}(\d{3,4})/i.exec(text);

  if (targetCountries.length === 0) unclear.push("Страны не названы");
  if (budget === null) unclear.push("Бюджет не назван");

  return {
    grade,
    homeCountry: null,
    intakeYear: null,
    targetCountries,
    interest,
    budget,
    nationalScore,
    nationalTaken,
    sat: sat?.[1] ? Number(sat[1]) : null,
    languageTest,
    languageScore,
    unclear: unclear.slice(0, 4),
  };
}

/** Yearly budget in thousands of dollars, digits or words. */
function readThousands(text: string): number | null {
  const digits = /(\d{1,3})\s*(?:000|тыс\w*|k(?![a-z]))/i.exec(text);
  if (digits?.[1]) return Number(digits[1]);

  const plainDollars = /\$\s*(\d{3,6})/.exec(text);
  if (plainDollars?.[1]) return Math.round(Number(plainDollars[1]) / 1000);

  if (/тысяч/i.test(text)) {
    for (const [pattern, value] of SPELLED_THOUSANDS) {
      if (pattern.test(text)) return value;
    }
  }
  return null;
}
