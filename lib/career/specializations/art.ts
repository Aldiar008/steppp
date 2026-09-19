import type { Specialization } from "../types";

/**
 * §3.7 — ART. Local axes: R1 ПРИКЛАДНОСТЬ, R2 НОСИТЕЛЬ, R3 КОМАНДА,
 * R4 ТЕХНИКА.
 */
export const ART_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "ART_GRAPH",
    field: "ART",
    label: "Графический дизайн и брендинг",
    localAxes: { R1: "прикл. ↑", R2: "плоскость", R3: "↓", R4: "~" },
    differentiator: "Решает задачу клиента средствами формы",
  },
  {
    id: "ART_UXVIS",
    field: "ART",
    label: "Визуальный дизайн продукта",
    localAxes: { R1: "прикл. ↑↑", R2: "плоскость", R3: "~", R4: "↑" },
    differentiator: "Ближайший сосед IT_UX, но отвечает за вид, а не за логику",
  },
  {
    id: "ART_IND",
    field: "ART",
    label: "Промышленный дизайн",
    localAxes: { R1: "прикл. ↑", R2: "объём", R3: "~", R4: "↑" },
    differentiator: "Форма ограничена производством; мост в ENG_MECH",
  },
  {
    id: "ART_ARCH",
    field: "ART",
    label: "Архитектура",
    localAxes: { R1: "прикл. ↑", R2: "объём ↑↑", R3: "↑", R4: "↑" },
    differentiator: "Самый длинный цикл в поле и юридическая ответственность",
  },
  {
    id: "ART_ANIM",
    field: "ART",
    label: "Анимация и motion",
    localAxes: { R1: "~", R2: "время", R3: "~", R4: "↑↑" },
    differentiator: "Движение как основной материал",
  },
  {
    id: "ART_FILM",
    field: "ART",
    label: "Кино и видеопроизводство",
    localAxes: { R1: "~", R2: "время", R3: "↑↑", R4: "↑" },
    differentiator: "Самая командная профессия поля",
  },
  {
    id: "ART_PHOTO",
    field: "ART",
    label: "Фотография",
    localAxes: { R1: "~", R2: "плоскость", R3: "↓↓", R4: "~" },
    differentiator: "Работает с реальностью, а не с чистым листом",
  },
  {
    id: "ART_MUSIC",
    field: "ART",
    label: "Музыка и звук",
    localAxes: { R1: "выск. ↑", R2: "время", R3: "~", R4: "~" },
    differentiator: "Единственный невизуальный носитель",
  },
  {
    id: "ART_PERF",
    field: "ART",
    label: "Исполнительские искусства",
    localAxes: { R1: "выск. ↑↑", R2: "тело", R3: "↑", R4: "↓" },
    differentiator: "Инструмент — собственное тело и присутствие",
  },
  {
    id: "ART_WRITE",
    field: "ART",
    label: "Литература и сценарное дело",
    localAxes: { R1: "~", R2: "время", R3: "↓", R4: "↓" },
    differentiator: "Материал — язык; самая одиночная работа поля",
  },
  {
    id: "ART_FASH",
    field: "ART",
    label: "Мода и текстиль",
    localAxes: { R1: "прикл.", R2: "тело", R3: "~", R4: "~" },
    differentiator: "Объект носят; сезонный цикл",
  },
  {
    id: "ART_GAMED",
    field: "ART",
    label: "Игровой дизайн",
    localAxes: { R1: "прикл.", R2: "время", R3: "↑↑", R4: "↑↑" },
    differentiator: "Проектирует правила и опыт, а не картинку",
  },
  {
    id: "ART_MEDIA",
    field: "ART",
    label: "Журналистика и медиа",
    localAxes: { R1: "прикл. ↑", R2: "время", R3: "~", R4: "~" },
    differentiator: "Обязанность перед фактом; мост в LAW",
  },
];
