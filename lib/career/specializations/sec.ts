import type { Specialization } from "../types";

/**
 * §3.11 — SEC. Local axes: C1 ФИЗИЧЕСКАЯ ПОДГОТОВКА, C2 ОПАСНОСТЬ,
 * C3 ИЕРАРХИЯ, C4 ОБЪЕКТ.
 */
export const SEC_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "SEC_MIL",
    field: "SEC",
    label: "Военная служба, офицер",
    localAxes: { C1: "↑↑", C2: "↑↑", C3: "↑↑↑", C4: "~" },
    differentiator: "Устав определяет всю жизнь, не только работу",
  },
  {
    id: "SEC_FIRE",
    field: "SEC",
    label: "МЧС и пожарная безопасность",
    localAxes: { C1: "↑↑↑", C2: "↑↑↑", C3: "↑↑", C4: "человек" },
    differentiator: "Спасение как прямое содержание работы",
  },
  {
    id: "SEC_POL",
    field: "SEC",
    label: "Правоохранительная деятельность",
    localAxes: { C1: "↑↑", C2: "↑↑", C3: "↑↑", C4: "человек" },
    differentiator: "Власть над другими и ответственность за её применение",
  },
  {
    id: "SEC_FOREN",
    field: "SEC",
    label: "Криминалистика",
    localAxes: { C1: "↓", C2: "↓", C3: "↑", C4: "объект" },
    differentiator: "Лаборатория внутри правоохранительной системы; мост в SCI_CHEM",
  },
  {
    id: "SEC_HSE",
    field: "SEC",
    label: "Промышленная безопасность и охрана труда",
    localAxes: { C1: "~", C2: "~", C3: "↑", C4: "система" },
    differentiator: "Предотвращает; непопулярная роль внутри компании",
  },
  {
    id: "SEC_COACH",
    field: "SEC",
    label: "Спортивная тренерская работа",
    localAxes: { C1: "↑↑", C2: "↓", C3: "~", C4: "человек" },
    differentiator: "Развивает чужое тело; мост в EDU",
  },
  {
    id: "SEC_ATHL",
    field: "SEC",
    label: "Профессиональный спорт",
    localAxes: { C1: "↑↑↑", C2: "~", C3: "~", C4: "себя" },
    differentiator: "Очень короткая карьера — обязательно говорить об этом честно",
  },
  {
    id: "SEC_SPSCI",
    field: "SEC",
    label: "Спортивная наука и физиология",
    localAxes: { C1: "↓", C2: "↓", C3: "↓", C4: "человек" },
    differentiator: "Мост между SCI_BIO и MED_REHAB",
  },
  {
    id: "SEC_EMERG",
    field: "SEC",
    label: "Управление чрезвычайными ситуациями",
    localAxes: { C1: "~", C2: "~", C3: "↑↑", C4: "система" },
    differentiator: "Планирование и координация, а не выезд",
  },
  {
    id: "SEC_GUARD",
    field: "SEC",
    label: "Охрана и физическая безопасность объектов",
    localAxes: { C1: "↑↑", C2: "~", C3: "↑↑", C4: "объект" },
    differentiator: "Низкий порог входа, важна надёжность",
  },
];
