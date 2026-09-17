import type { Iso } from "@/types/domain";

const MS_PER_DAY = 86_400_000;

/** Parses "YYYY-MM-DD" as a UTC midnight timestamp. Throws on malformed input. */
export function parseIso(iso: Iso): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Not an ISO date: ${iso}`);
  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

export function toIso(ms: number): Iso {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today at UTC midnight, so every countdown in the app agrees to the day. */
export function todayIso(now: Date = new Date()): Iso {
  return toIso(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addDays(iso: Iso, days: number): Iso {
  return toIso(parseIso(iso) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: Iso, to: Iso): number {
  return Math.round((parseIso(to) - parseIso(from)) / MS_PER_DAY);
}

export function isBefore(a: Iso, b: Iso): boolean {
  return parseIso(a) < parseIso(b);
}

export function minIso(dates: readonly Iso[]): Iso | null {
  let best: Iso | null = null;
  for (const d of dates) if (best === null || isBefore(d, best)) best = d;
  return best;
}

export function monthKey(iso: Iso): string {
  return iso.slice(0, 7);
}

const MONTHS_RU = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;

const MONTHS_RU_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

/** "14 марта 2026" */
export function formatDateRu(iso: Iso): string {
  const [y, m, d] = iso.split("-");
  const month = MONTHS_RU_GEN[Number(m) - 1] ?? "";
  return `${Number(d)} ${month} ${y}`;
}

/** "март 2026", used for roadmap month headings. */
export function formatMonthRu(key: string): string {
  const [y, m] = key.split("-");
  const month = MONTHS_RU[Number(m) - 1] ?? "";
  return `${month} ${y}`;
}

/** Russian plural forms: 1 день, 2 дня, 5 дней. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function formatDaysRu(days: number): string {
  return `${days} ${pluralRu(days, "день", "дня", "дней")}`;
}
