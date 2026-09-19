import type { Specialization } from "../types";

/**
 * §3.5 — BIZ. Local axes: B1 ЧИСЛА, B2 ЛЮДИ, B3 РИСК, B5 РЕГЛАМЕНТ (B4
 * ГОРИЗОНТ is named but the table gives no per-row column).
 */
export const BIZ_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "BIZ_FIN",
    field: "BIZ",
    label: "Финансы и инвестиции",
    localAxes: { B1: "↑↑", B2: "~", B3: "↑", B5: "↑" },
    differentiator: "Решение = модель + ставка; результат измерим деньгами",
  },
  {
    id: "BIZ_ACC",
    field: "BIZ",
    label: "Бухучёт и аудит",
    localAxes: { B1: "↑↑", B2: "↓", B3: "↓↓", B5: "↑↑" },
    differentiator: "Правильность важнее скорости; наименьший риск в поле",
  },
  {
    id: "BIZ_MKT",
    field: "BIZ",
    label: "Маркетинг",
    localAxes: { B1: "~", B2: "↑", B3: "~", B5: "↓" },
    differentiator: "Работа с вниманием и смыслом; мост в ART",
  },
  {
    id: "BIZ_MGMT",
    field: "BIZ",
    label: "Менеджмент и операции",
    localAxes: { B1: "↓", B2: "↑↑", B3: "~", B5: "~" },
    differentiator: "Результат достигается чужими руками",
  },
  {
    id: "BIZ_ENT",
    field: "BIZ",
    label: "Предпринимательство",
    localAxes: { B1: "~", B2: "↑↑", B3: "↑↑", B5: "↓↓" },
    differentiator: "Единственная, где никто не говорит, что делать",
  },
  {
    id: "BIZ_SCM",
    field: "BIZ",
    label: "Логистика и цепи поставок",
    localAxes: { B1: "↑", B2: "~", B3: "↓", B5: "↑" },
    differentiator: "Физический мир под управлением таблицы; мост в ENG_IND",
  },
  {
    id: "BIZ_HR",
    field: "BIZ",
    label: "HR и управление людьми",
    localAxes: { B1: "↓", B2: "↑↑", B3: "↓", B5: "~" },
    differentiator: "Объект — люди внутри компании; мост в EDU_PSY",
  },
  {
    id: "BIZ_TRADE",
    field: "BIZ",
    label: "Международная торговля и ВЭД",
    localAxes: { B1: "↑", B2: "↑", B3: "~", B5: "↑↑" },
    differentiator: "Правила разных стран как основное содержание",
  },
  {
    id: "BIZ_BANK",
    field: "BIZ",
    label: "Банковское дело",
    localAxes: { B1: "↑", B2: "~", B3: "↓", B5: "↑↑" },
    differentiator: "Жёсткий регламент плюс работа с клиентом",
  },
  {
    id: "BIZ_BA",
    field: "BIZ",
    label: "Бизнес-аналитика",
    localAxes: { B1: "↑↑", B2: "~", B3: "↓", B5: "~" },
    differentiator: "Переводит данные в решения; мост в IT_DS",
  },
  {
    id: "BIZ_RE",
    field: "BIZ",
    label: "Недвижимость и девелопмент",
    localAxes: { B1: "~", B2: "↑", B3: "↑", B5: "~" },
    differentiator: "Длинный цикл, физический объект, крупные сделки",
  },
  {
    id: "BIZ_SALES",
    field: "BIZ",
    label: "Продажи и развитие бизнеса",
    localAxes: { B1: "↓", B2: "↑↑", B3: "↑", B5: "↓" },
    differentiator: "Доход прямо привязан к результату разговора",
  },
];
