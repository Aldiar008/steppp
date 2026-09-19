import type { Specialization } from "../types";

/**
 * §3.4 — MED. Local axes: M1 ТЕЛЕСНОСТЬ, M2 ОСТРОТА, M3 ДЛИНА ОТНОШЕНИЙ,
 * M4 МАСШТАБ (M5 ГОДЫ УЧЁБЫ is named but the table gives no per-row column).
 */
export const MED_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "MED_GP",
    field: "MED",
    label: "Лечебное дело, врач общей практики",
    localAxes: { M1: "~", M2: "плановое", M3: "↑", M4: "один" },
    differentiator: "Широта, а не глубина; первый контакт",
  },
  {
    id: "MED_SURG",
    field: "MED",
    label: "Хирургия",
    localAxes: { M1: "↑↑", M2: "острое", M3: "↓", M4: "один" },
    differentiator: "Результат виден за часы; мануальный навык решает",
  },
  {
    id: "MED_DENT",
    field: "MED",
    label: "Стоматология",
    localAxes: { M1: "↑↑", M2: "плановое", M3: "~", M4: "один" },
    differentiator: "Тонкая моторика в малом поле; ранняя самостоятельность и частная практика",
  },
  {
    id: "MED_PHARM",
    field: "MED",
    label: "Фармация",
    localAxes: { M1: "↓", M2: "—", M3: "↓", M4: "масштаб" },
    differentiator: "Работа с веществом, а не с телом; мост в SCI_CHEM",
  },
  {
    id: "MED_NURS",
    field: "MED",
    label: "Сестринское дело",
    localAxes: { M1: "↑", M2: "~", M3: "↑↑", M4: "один" },
    differentiator: "Больше всего часов рядом с пациентом; забота как основное содержание",
  },
  {
    id: "MED_PSY",
    field: "MED",
    label: "Психиатрия и психическое здоровье",
    localAxes: { M1: "↓", M2: "хрон.", M3: "↑↑", M4: "один" },
    differentiator: "Инструмент — разговор и препарат, объект — психика",
  },
  {
    id: "MED_REHAB",
    field: "MED",
    label: "Реабилитация и физиотерапия",
    localAxes: { M1: "↑", M2: "хрон.", M3: "↑↑", M4: "один" },
    differentiator: "Долгое восстановление, видимый прогресс, работа с движением",
  },
  {
    id: "MED_DIAG",
    field: "MED",
    label: "Диагностика и лучевые методы",
    localAxes: { M1: "↓", M2: "~", M3: "↓↓", M4: "один" },
    differentiator: "Почти нет контакта с пациентом; ищет ответ в изображении",
  },
  {
    id: "MED_PUB",
    field: "MED",
    label: "Общественное здравоохранение и эпидемиология",
    localAxes: { M1: "↓↓", M2: "~", M3: "↓", M4: "население ↑↑" },
    differentiator: "Пациент — популяция; ближе к SCI_STAT и LAW_GOV",
  },
  {
    id: "MED_VET",
    field: "MED",
    label: "Ветеринария",
    localAxes: { M1: "↑↑", M2: "~", M3: "~", M4: "один" },
    differentiator: "Пациент не говорит; сильная связь с ENV",
  },
  {
    id: "MED_NUTR",
    field: "MED",
    label: "Нутрициология и диетология",
    localAxes: { M1: "↓", M2: "хрон.", M3: "↑", M4: "~" },
    differentiator: "Меняет поведение, а не ткань",
  },
  {
    id: "MED_EMS",
    field: "MED",
    label: "Экстренная помощь, парамедик",
    localAxes: { M1: "↑↑", M2: "острое ↑↑", M3: "↓↓", M4: "один" },
    differentiator: "Решение за минуты в неподготовленных условиях; мост в SEC",
  },
];
