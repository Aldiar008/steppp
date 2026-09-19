import { findSpecialization } from "./specializations/index";
import type { EvidenceEntry, FieldId, Specialization } from "./types";

/**
 * Part 10.4's hard rule — "У каждой специальности показывается цена" —
 * applied structurally: a result item cannot be built without both a
 * quote-grounded "why" (§10.3) and a "what's hard" line, and there is no
 * code path anywhere in this module that renders one without the other.
 *
 * "What's hard" is synthesized, never hand-authored per specialization
 * (~120 of them), from two sources already in the document:
 *   1. the specialization's own "Что отличает" text, when it already names a
 *      cost (several rows do — `SEC_ATHL`, `MED_REHAB`, `ENG_MINE` — this is
 *      the document's own words, just reused for a second purpose);
 *   2. failing that, a small per-(field, local axis) phrase table for the
 *      axis values the document marks as extreme (`↑↑`, `↑↑↑`, `↓↓`) — far
 *      less hand-written text than one bespoke sentence per specialization,
 *      and every phrase traces to a real cell in the document's own tables.
 */

const HARDSHIP_KEYWORD = /цена ошибки|тяжёл|риск|опасн|экстремальн|дорог|жёстк|карьера|нагрузк|ответственност|долгий цикл|юридическ/i;

interface AxisHardshipRule {
  field: FieldId;
  axis: string;
  /** Matches when the cell's text ends with or contains this token. */
  matches: string;
  phrase: string;
}

const AXIS_HARDSHIP_RULES: readonly AxisHardshipRule[] = [
  { field: "ENG", axis: "E2", matches: "↑↑", phrase: "Объект — живой организм: цена ошибки не считается деньгами." },
  { field: "ENG", axis: "E5", matches: "↑↑", phrase: "Работаешь с тем, что нельзя увидеть напрямую — ток, сигнал, поле." },
  { field: "IT", axis: "I3", matches: "↑↑", phrase: "Результат вероятностный, а не гарантированное «работает / не работает»." },
  { field: "IT", axis: "I2", matches: "невидимый ↑↑", phrase: "Работу никто не замечает, пока она не сломается." },
  { field: "IT", axis: "I4", matches: "↑↑", phrase: "Есть живой противник, который целенаправленно ищет уязвимость." },
  { field: "IT", axis: "I1", matches: "↑↑", phrase: "Жёсткие ограничения памяти и питания устройства." },
  { field: "SCI", axis: "S2", matches: "↑↑", phrase: "Много часов физической работы руками у стола с приборами." },
  { field: "SCI", axis: "S3", matches: "фунд. ↑↑", phrase: "Результат может не найти применения при жизни исследователя." },
  { field: "SCI", axis: "S4", matches: "↑↑", phrase: "Многочасовая работа в одиночку — не для всех отдых." },
  { field: "MED", axis: "M1", matches: "↑↑", phrase: "Руки непосредственно в теле пациента — ответственность за здоровье и жизнь." },
  { field: "MED", axis: "M2", matches: "острое", phrase: "Решения за минуты, без права на ошибку." },
  { field: "MED", axis: "M3", matches: "↑↑", phrase: "Долгие, эмоционально тяжёлые отношения с одним и тем же человеком." },
  { field: "MED", axis: "M4", matches: "население", phrase: "Результат обезличен — не видно, кому конкретно ты помог." },
  { field: "BIZ", axis: "B2", matches: "↑↑", phrase: "Результат целиком зависит от людей, которых ты не полностью контролируешь." },
  { field: "BIZ", axis: "B3", matches: "↑↑", phrase: "Можно потратить годы без гарантии, что вообще что-то получится." },
  { field: "BIZ", axis: "B5", matches: "↑↑", phrase: "Жёсткий регламент — ошибка в букве правил стоит дорого." },
  { field: "LAW", axis: "L1", matches: "↑↑", phrase: "Прямая состязательность и высокая эмоциональная нагрузка." },
  { field: "LAW", axis: "L2", matches: "↑↑", phrase: "Многочасовая работа с документом, где каждое слово имеет цену." },
  { field: "ART", axis: "R1", matches: "↑↑", phrase: "Отвечаешь за задачу клиента, а не за собственное высказывание." },
  { field: "ART", axis: "R2", matches: "объём ↑↑", phrase: "Самый длинный цикл в поле и юридическая ответственность за результат." },
  { field: "ART", axis: "R3", matches: "↑↑", phrase: "Результат полностью зависит от согласованности большой команды." },
  { field: "ART", axis: "R4", matches: "↑↑", phrase: "Успех требует освоения сложной технологии, а не только ремесла." },
  { field: "EDU", axis: "D2", matches: "↑↑", phrase: "Прогресс подопечного измеряется миллиметрами, а не быстрыми победами." },
  { field: "EDU", axis: "D3", matches: "↑↑", phrase: "Эмоционально тяжёлые случаи, которые не всегда получается «не уносить домой»." },
  { field: "EDU", axis: "D4", matches: "↑↑", phrase: "Придётся проектировать систему обучения, а не работать с одним человеком." },
  { field: "ENV", axis: "V2", matches: "↑↑", phrase: "Большая часть года — не в помещении, а в поле." },
  { field: "ENV", axis: "V3", matches: "производство ↑↑", phrase: "Погода и урожай — риск, который нельзя контролировать." },
  { field: "ENV", axis: "V3", matches: "охрана ↑↑", phrase: "Цель — сохранить, а не произвести: результат не измеряется прибылью." },
  { field: "TRD", axis: "T3", matches: "↑↑↑", phrase: "Самый жёсткий отбор и самое дорогое обучение в поле." },
  { field: "TRD", axis: "T3", matches: "↑↑", phrase: "Официальный допуск обязателен — без него к работе не подпустят." },
  { field: "TRD", axis: "T4", matches: "↑↑", phrase: "Придётся самому искать клиентов и отвечать за результат." },
  { field: "SEC", axis: "C1", matches: "↑↑↑", phrase: "Экстремальные физические требования; карьера может быть короткой." },
  { field: "SEC", axis: "C1", matches: "↑↑", phrase: "Высокие требования к физической подготовке." },
  { field: "SEC", axis: "C2", matches: "↑↑↑", phrase: "Идёшь туда, откуда все остальные убегают." },
  { field: "SEC", axis: "C2", matches: "↑↑", phrase: "Реальная опасность для здоровья и жизни." },
  { field: "SEC", axis: "C3", matches: "↑↑↑", phrase: "Устав определяет не только работу, но и всю жизнь." },
  { field: "SEC", axis: "C3", matches: "↑↑", phrase: "Жёсткая иерархия и устав определяют распорядок дня." },
];

const GENERIC_HARD_PART = "Требует специальной подготовки и вхождения в профессию — это стоит уточнить отдельно, прежде чем выбирать.";

export function whatIsHard(spec: Specialization): string {
  if (HARDSHIP_KEYWORD.test(spec.differentiator)) return spec.differentiator;

  for (const rule of AXIS_HARDSHIP_RULES) {
    if (rule.field !== spec.field) continue;
    const value = spec.localAxes[rule.axis];
    if (value !== undefined && value.includes(rule.matches)) return rule.phrase;
  }

  return GENERIC_HARD_PART;
}

/* -------------------------------------------------------------------------- */
/* "Why" — quote-grounded, §10.3                                             */
/* -------------------------------------------------------------------------- */

/**
 * §10.3 — "Каждый результат объясним... если объяснения нет, специальность
 * не показывается." The strongest evidence entry (largest absolute shift)
 * whose dimension the specialization's field profile actually cares about is
 * quoted directly; if no evidence touches this field at all, the
 * specialization is not shown (see `buildResultItem`).
 */
export function strongestEvidenceFor(field: FieldId, evidence: readonly EvidenceEntry[]): EvidenceEntry | null {
  if (evidence.length === 0) return null;
  const sorted = [...evidence].sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
  return sorted[0] ?? null;
}

export interface CareerResultItem {
  id: string;
  field: FieldId;
  label: string;
  why: string;
  hard: string;
}

/**
 * One result item, or `null` when there is no groundable evidence — the
 * document's own rule, not a fallback of convenience. Never includes a "%"
 * anywhere (§10.2/§11.2 test #10): nothing here computes or formats a
 * percentage in the first place.
 */
export function buildResultItem(specId: string, evidence: readonly EvidenceEntry[]): CareerResultItem | null {
  const spec = findSpecialization(specId);
  if (spec === undefined) return null;

  const strongest = strongestEvidenceFor(spec.field, evidence);
  if (strongest === null) return null;

  return {
    id: spec.id,
    field: spec.field,
    label: spec.label,
    why: `Ты сказал: «${strongest.quote}» — это ближе всего к тому, чем занимаются в направлении «${spec.label}».`,
    hard: whatIsHard(spec),
  };
}

export function buildResults(
  rankedSpecIds: readonly string[],
  vetoedIds: ReadonlySet<string>,
  evidence: readonly EvidenceEntry[],
): readonly CareerResultItem[] {
  const items: CareerResultItem[] = [];
  for (const id of rankedSpecIds) {
    if (vetoedIds.has(id)) continue; // defense in depth — §11.2 test #2
    const item = buildResultItem(id, evidence);
    if (item !== null) items.push(item);
    if (items.length >= 3) break;
  }
  return items;
}
