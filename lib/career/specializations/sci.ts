import type { Specialization } from "../types";

/**
 * §3.3 — SCI. Local axes: S1 ОБЪЕКТ, S2 ЭКСПЕРИМЕНТ, S3 ПРИКЛАДНОСТЬ,
 * S4 ОДИНОЧЕСТВО.
 */
export const SCI_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "SCI_MATH",
    field: "SCI",
    label: "Математика",
    localAxes: { S1: "число", S2: "↓↓", S3: "фунд.", S4: "↑↑" },
    differentiator: "Единственная, где не нужна лаборатория вообще",
  },
  {
    id: "SCI_PHYS",
    field: "SCI",
    label: "Физика",
    localAxes: { S1: "материя", S2: "~", S3: "фунд.", S4: "~" },
    differentiator: "Ищет закон, а не вещество; тяжёлая математика",
  },
  {
    id: "SCI_CHEM",
    field: "SCI",
    label: "Химия",
    localAxes: { S1: "вещество", S2: "↑↑", S3: "~", S4: "~" },
    differentiator: "Много часов руками у стола; ощутимый результат синтеза",
  },
  {
    id: "SCI_BIO",
    field: "SCI",
    label: "Биология и молекулярная биология",
    localAxes: { S1: "организм", S2: "↑", S3: "~", S4: "~" },
    differentiator: "Объект сам меняется и умирает; эксперимент идёт неделями",
  },
  {
    id: "SCI_BIOTECH",
    field: "SCI",
    label: "Биотехнологии",
    localAxes: { S1: "организм", S2: "↑↑", S3: "прикл. ↑↑", S4: "~" },
    differentiator: "Биология, доведённая до производства",
  },
  {
    id: "SCI_NEURO",
    field: "SCI",
    label: "Нейронаука",
    localAxes: { S1: "организм", S2: "↑", S3: "~", S4: "~" },
    differentiator: "Стык биологии, данных и психики",
  },
  {
    id: "SCI_ASTRO",
    field: "SCI",
    label: "Астрономия и астрофизика",
    localAxes: { S1: "космос", S2: "↓", S3: "фунд. ↑↑", S4: "↑" },
    differentiator: "Объект принципиально недоступен; всё через данные",
  },
  {
    id: "SCI_STAT",
    field: "SCI",
    label: "Статистика и научный анализ данных",
    localAxes: { S1: "число", S2: "↓", S3: "прикл.", S4: "~" },
    differentiator: "Метод продаётся в любую отрасль",
  },
  {
    id: "SCI_GEOPH",
    field: "SCI",
    label: "Геофизика",
    localAxes: { S1: "материя", S2: "↑", S3: "прикл.", S4: "~" },
    differentiator: "Полевые измерения; прямой мост в ENG_PETRO",
  },
];
