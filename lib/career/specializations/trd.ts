import type { Specialization } from "../types";

/**
 * §3.10 — TRD. Local axes: T1 МАТЕРИАЛ, T2 МОБИЛЬНОСТЬ, T3 СЕРТИФИКАЦИЯ,
 * T4 САМОЗАНЯТОСТЬ.
 */
export const TRD_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "TRD_ELEC",
    field: "TRD",
    label: "Электромонтаж",
    localAxes: { T1: "электричество", T2: "выезды", T3: "↑", T4: "↑↑" },
    differentiator: "Невидимая опасность; допуск обязателен",
  },
  {
    id: "TRD_WELD",
    field: "TRD",
    label: "Сварка и металлообработка",
    localAxes: { T1: "металл", T2: "цех", T3: "↑", T4: "~" },
    differentiator: "Шов виден и проверяется; высокий спрос на вахте",
  },
  {
    id: "TRD_AUTO",
    field: "TRD",
    label: "Автомеханика и диагностика",
    localAxes: { T1: "машина", T2: "цех", T3: "~", T4: "↑↑" },
    differentiator: "Диагностика как детектив; быстрый цикл «сломано → починил»",
  },
  {
    id: "TRD_CONS",
    field: "TRD",
    label: "Строительно-монтажные специальности",
    localAxes: { T1: "материал", T2: "выезды", T3: "~", T4: "↑" },
    differentiator: "Объект растёт на глазах; сезонность и бригада",
  },
  {
    id: "TRD_CNC",
    field: "TRD",
    label: "Оператор ЧПУ и станочник",
    localAxes: { T1: "металл", T2: "цех", T3: "↑", T4: "↓" },
    differentiator: "Точность в сотых долях; мост в ENG_MECH",
  },
  {
    id: "TRD_PILOT",
    field: "TRD",
    label: "Пилот гражданской авиации",
    localAxes: { T1: "машина", T2: "дальние", T3: "↑↑↑", T4: "↓↓" },
    differentiator: "Самый жёсткий отбор и дорогое обучение в поле",
  },
  {
    id: "TRD_AVTECH",
    field: "TRD",
    label: "Авиатехник",
    localAxes: { T1: "машина", T2: "цех", T3: "↑↑↑", T4: "↓" },
    differentiator: "Цена ошибки как в медицине, регламент абсолютный",
  },
  {
    id: "TRD_RAIL",
    field: "TRD",
    label: "Железнодорожный транспорт",
    localAxes: { T1: "машина", T2: "дальние", T3: "↑↑", T4: "↓" },
    differentiator: "Строгий график и смены; крупный работодатель в РК",
  },
  {
    id: "TRD_LOG",
    field: "TRD",
    label: "Транспортная логистика и диспетчеризация",
    localAxes: { T1: "система", T2: "офис", T3: "~", T4: "~" },
    differentiator: "Управляет движением, не участвуя в нём; мост в BIZ_SCM",
  },
  {
    id: "TRD_CULIN",
    field: "TRD",
    label: "Кулинария и ресторанное дело",
    localAxes: { T1: "еда", T2: "цех", T3: "↓", T4: "↑↑" },
    differentiator: "Результат оценивают через 15 минут; жёсткий темп",
  },
  {
    id: "TRD_BEAUTY",
    field: "TRD",
    label: "Парикмахерское дело и бьюти-индустрия",
    localAxes: { T1: "человек", T2: "салон", T3: "↓", T4: "↑↑" },
    differentiator: "Ремесло плюс постоянный контакт с клиентом",
  },
  {
    id: "TRD_HVAC",
    field: "TRD",
    label: "Инженерные системы зданий (HVAC)",
    localAxes: { T1: "машина", T2: "выезды", T3: "↑", T4: "↑" },
    differentiator: "Обслуживает то, что построил ENG_CIV",
  },
];
