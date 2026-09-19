import type { Specialization } from "../types";

/**
 * §3.6 — LAW. Local axes: L1 СОСТЯЗАТЕЛЬНОСТЬ, L2 ТЕКСТ, L3 ПУБЛИЧНОСТЬ,
 * L4 КЛИЕНТ.
 */
export const LAW_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "LAW_CORP",
    field: "LAW",
    label: "Корпоративное право",
    localAxes: { L1: "↓", L2: "↑↑", L3: "↓", L4: "компания" },
    differentiator: "Сделки и договоры; предотвращает конфликт, а не выигрывает его",
  },
  {
    id: "LAW_CRIM",
    field: "LAW",
    label: "Уголовное право и адвокатура",
    localAxes: { L1: "↑↑", L2: "~", L3: "↑", L4: "человек" },
    differentiator: "Прямая состязательность, высокая эмоциональная нагрузка",
  },
  {
    id: "LAW_INTL",
    field: "LAW",
    label: "Международное право",
    localAxes: { L1: "~", L2: "↑↑", L3: "~", L4: "государство" },
    differentiator: "Несколько правовых систем одновременно; языки обязательны",
  },
  {
    id: "LAW_GOV",
    field: "LAW",
    label: "Государственное управление",
    localAxes: { L1: "↓", L2: "↑", L3: "~", L4: "общество" },
    differentiator: "Меняет правила, а не применяет их",
  },
  {
    id: "LAW_POL",
    field: "LAW",
    label: "Политология и политический анализ",
    localAxes: { L1: "↓", L2: "↑", L3: "~", L4: "общество" },
    differentiator: "Исследует и прогнозирует; мост в SCI_STAT",
  },
  {
    id: "LAW_DIPL",
    field: "LAW",
    label: "Дипломатия и международные отношения",
    localAxes: { L1: "~", L2: "~", L3: "↑↑", L4: "государство" },
    differentiator: "Переговоры как основная технология",
  },
  {
    id: "LAW_URB",
    field: "LAW",
    label: "Урбанистика и городская политика",
    localAxes: { L1: "↓", L2: "~", L3: "~", L4: "общество" },
    differentiator: "Стык права, данных и физического города; мост в ENG_CIV",
  },
  {
    id: "LAW_NGO",
    field: "LAW",
    label: "Некоммерческий сектор и социальные изменения",
    localAxes: { L1: "~", L2: "~", L3: "↑", L4: "общество" },
    differentiator: "Ресурсов мало, миссия ведёт; мост в EDU_SOC",
  },
  {
    id: "LAW_TAX",
    field: "LAW",
    label: "Налоговое и финансовое право",
    localAxes: { L1: "↓", L2: "↑↑", L3: "↓", L4: "компания" },
    differentiator: "Самая счётная часть права; мост в BIZ_ACC",
  },
  {
    id: "LAW_COMP",
    field: "LAW",
    label: "Комплаенс и корпоративное управление",
    localAxes: { L1: "↓", L2: "↑↑", L3: "↓", L4: "компания" },
    differentiator: "Следит, чтобы компания не нарушила; внутренний контролёр",
  },
  {
    id: "LAW_JUD",
    field: "LAW",
    label: "Судебная система и нотариат",
    localAxes: { L1: "~", L2: "↑↑", L3: "~", L4: "общество" },
    differentiator: "Беспристрастность как профессиональное требование",
  },
];
