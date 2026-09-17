/**
 * Home countries and their school-leaving exams.
 *
 * Ported from the Vite prototype and trimmed to the countries the product
 * actually reasons about. `max` is the exam scale, used only to normalise a
 * score into a percentile; it never feeds a date.
 */

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface NationalExam {
  name: string;
  max: number;
  hint: string;
  /** Scales where a lower number is a better result, e.g. German Abitur. */
  betterLower?: boolean;
}

export const HOME_COUNTRIES: readonly Country[] = [
  { code: "KZ", name: "Казахстан", flag: "🇰🇿" },
  { code: "UZ", name: "Узбекистан", flag: "🇺🇿" },
  { code: "KG", name: "Кыргызстан", flag: "🇰🇬" },
  { code: "TJ", name: "Таджикистан", flag: "🇹🇯" },
  { code: "AZ", name: "Азербайджан", flag: "🇦🇿" },
  { code: "AM", name: "Армения", flag: "🇦🇲" },
  { code: "GE", name: "Грузия", flag: "🇬🇪" },
  { code: "RU", name: "Россия", flag: "🇷🇺" },
  { code: "BY", name: "Беларусь", flag: "🇧🇾" },
  { code: "UA", name: "Украина", flag: "🇺🇦" },
  { code: "MD", name: "Молдова", flag: "🇲🇩" },
  { code: "MN", name: "Монголия", flag: "🇲🇳" },
] as const;

export const DESTINATIONS: readonly Country[] = [
  { code: "KZ", name: "Казахстан", flag: "🇰🇿" },
  { code: "US", name: "США", flag: "🇺🇸" },
  { code: "GB", name: "Великобритания", flag: "🇬🇧" },
  { code: "DE", name: "Германия", flag: "🇩🇪" },
  { code: "NL", name: "Нидерланды", flag: "🇳🇱" },
  { code: "PL", name: "Польша", flag: "🇵🇱" },
  { code: "CZ", name: "Чехия", flag: "🇨🇿" },
  { code: "TR", name: "Турция", flag: "🇹🇷" },
  { code: "KR", name: "Южная Корея", flag: "🇰🇷" },
  { code: "CN", name: "Китай", flag: "🇨🇳" },
  { code: "AE", name: "ОАЭ", flag: "🇦🇪" },
  { code: "HU", name: "Венгрия", flag: "🇭🇺" },
  { code: "CA", name: "Канада", flag: "🇨🇦" },
  { code: "CH", name: "Швейцария", flag: "🇨🇭" },
  { code: "AT", name: "Австрия", flag: "🇦🇹" },
  { code: "FR", name: "Франция", flag: "🇫🇷" },
  { code: "IT", name: "Италия", flag: "🇮🇹" },
  { code: "SE", name: "Швеция", flag: "🇸🇪" },
  { code: "SG", name: "Сингапур", flag: "🇸🇬" },
  { code: "HK", name: "Гонконг", flag: "🇭🇰" },
  { code: "JP", name: "Япония", flag: "🇯🇵" },
] as const;

export const NATIONAL_EXAMS: Readonly<Record<string, NationalExam>> = {
  KZ: { name: "ЕНТ", max: 140, hint: "Максимум 140 баллов" },
  UZ: { name: "ДТМ", max: 189, hint: "Максимум 189 баллов" },
  KG: { name: "ОРТ", max: 245, hint: "Основной тест, максимум 245" },
  TJ: { name: "НЦТ", max: 1000, hint: "Максимум 1000 баллов" },
  AZ: { name: "Buraxılış", max: 700, hint: "Максимум 700 баллов" },
  AM: { name: "Միասնական", max: 20, hint: "Шкала 0–20" },
  GE: { name: "ერთიანი გამოცდები", max: 100, hint: "Процентиль 0–100" },
  RU: { name: "ЕГЭ", max: 300, hint: "Сумма трёх предметов, максимум 300" },
  BY: { name: "ЦЭ", max: 400, hint: "Сумма четырёх результатов" },
  UA: { name: "НМТ", max: 200, hint: "Шкала 100–200" },
  MD: { name: "BAC", max: 10, hint: "Шкала 1–10" },
  MN: { name: "ЭЕШ", max: 800, hint: "Максимум 800 баллов" },
};

const FALLBACK_EXAM: NationalExam = {
  name: "Выпускной экзамен",
  max: 100,
  hint: "Введи результат в процентах",
};

export function examFor(countryCode: string): NationalExam {
  return NATIONAL_EXAMS[countryCode] ?? FALLBACK_EXAM;
}

export function countryName(code: string, list: readonly Country[] = DESTINATIONS): string {
  return list.find((c) => c.code === code)?.name ?? code;
}

export function countryFlag(code: string): string {
  const all = [...HOME_COUNTRIES, ...DESTINATIONS];
  return all.find((c) => c.code === code)?.flag ?? "";
}
