import type { Specialization } from "../types";

/**
 * §3.8 — EDU. Local axes: D1 ВОЗРАСТ ПОДОПЕЧНОГО, D2 ГЛУБИНА, D3 НАГРУЗКА,
 * D4 СИСТЕМНОСТЬ.
 */
export const EDU_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "EDU_TEACH",
    field: "EDU",
    label: "Школьное преподавание",
    localAxes: { D1: "7–17", D2: "многим", D3: "~", D4: "~" },
    differentiator: "Предмет плюс класс из тридцати; управление вниманием",
  },
  {
    id: "EDU_EARLY",
    field: "EDU",
    label: "Дошкольное образование",
    localAxes: { D1: "2–6", D2: "многим", D3: "~", D4: "↓" },
    differentiator: "Развитие, а не знания; максимум телесного контакта",
  },
  {
    id: "EDU_SPEC",
    field: "EDU",
    label: "Специальное и инклюзивное образование",
    localAxes: { D1: "любой", D2: "одному ↑↑", D3: "↑↑", D4: "~" },
    differentiator: "Прогресс измеряется миллиметрами",
  },
  {
    id: "EDU_PSY",
    field: "EDU",
    label: "Психология и консультирование",
    localAxes: { D1: "12+", D2: "одному ↑↑", D3: "↑", D4: "↓" },
    differentiator: "Инструмент — разговор; границы и этика как навык",
  },
  {
    id: "EDU_CLIN",
    field: "EDU",
    label: "Клиническая психология",
    localAxes: { D1: "12+", D2: "одному ↑↑", D3: "↑↑", D4: "↓" },
    differentiator: "Работа с патологией; длинное обучение, мост в MED_PSY",
  },
  {
    id: "EDU_SOC",
    field: "EDU",
    label: "Социальная работа",
    localAxes: { D1: "любой", D2: "одному", D3: "↑↑", D4: "~" },
    differentiator: "Работа с обстоятельствами жизни, а не с психикой",
  },
  {
    id: "EDU_INSTR",
    field: "EDU",
    label: "Методист и дизайн обучения, EdTech",
    localAxes: { D1: "любой", D2: "↓", D3: "↓", D4: "↑↑" },
    differentiator: "Проектирует, как учатся тысячи; мост в IT_PM",
  },
  {
    id: "EDU_COACH",
    field: "EDU",
    label: "Коучинг и карьерное консультирование",
    localAxes: { D1: "15+", D2: "одному", D3: "↓", D4: "↓" },
    differentiator: "Работа со здоровым человеком и его выбором",
  },
  {
    id: "EDU_SLP",
    field: "EDU",
    label: "Логопедия",
    localAxes: { D1: "3–12", D2: "одному ↑↑", D3: "~", D4: "↓" },
    differentiator: "Узкий измеримый навык; мост в MED_REHAB",
  },
  {
    id: "EDU_HIGH",
    field: "EDU",
    label: "Преподавание в вузе и наука об образовании",
    localAxes: { D1: "18+", D2: "~", D3: "↓", D4: "↑" },
    differentiator: "Преподавание плюс исследование; мост в SCI",
  },
  {
    id: "EDU_YOUTH",
    field: "EDU",
    label: "Молодёжная работа и НКО",
    localAxes: { D1: "12–25", D2: "многим", D3: "~", D4: "~" },
    differentiator: "Вне школы, без обязательности; мост в LAW_NGO",
  },
];
