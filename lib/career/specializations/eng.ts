import type { Specialization } from "../types";

/**
 * §3.1 — ENG, transcribed verbatim. Local axes: E1 МАСШТАБ, E2 ЖИВОЕ,
 * E3 ДВИЖЕНИЕ, E4 СРЕДА, E5 ЭНЕРГИЯ/СИГНАЛ (E6 ЦЕНА ОШИБКИ is named in the
 * axis list but the table gives no per-row column for it, so it is omitted
 * here rather than guessed).
 */
export const ENG_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "ENG_CIV",
    field: "ENG",
    label: "Гражданское строительство",
    localAxes: { E1: "город", E2: "↓", E3: "статика", E4: "поле", E5: "↓" },
    differentiator: "Единственная, где объект неподвижен и стоит 50 лет; ответственность перед городом",
  },
  {
    id: "ENG_MECH",
    field: "ENG",
    label: "Механическая инженерия",
    localAxes: { E1: "машина", E2: "↓", E3: "движение ↑", E4: "цех", E5: "~" },
    differentiator: "Всё, что двигается и передаёт усилие; любовь к разборке",
  },
  {
    id: "ENG_ELEC",
    field: "ENG",
    label: "Электротехника и электроника",
    localAxes: { E1: "плата–сеть", E2: "↓", E3: "~", E4: "лаб/цех", E5: "↑↑" },
    differentiator: "Невидимый объект: ток и сигнал. Отличается от Mech тем, что нечего потрогать",
  },
  {
    id: "ENG_CHEM",
    field: "ENG",
    label: "Химическая инженерия",
    localAxes: { E1: "молекула–реактор", E2: "~", E3: "процесс", E4: "завод/лаб", E5: "↓" },
    differentiator: "Управление превращением вещества в непрерывном процессе",
  },
  {
    id: "ENG_PETRO",
    field: "ENG",
    label: "Нефтегазовое дело",
    localAxes: { E1: "месторождение", E2: "↓", E3: "поток", E4: "поле/вахта", E5: "~" },
    differentiator: "Работа в удалённых условиях, огромный масштаб, сырьевая экономика",
  },
  {
    id: "ENG_MINE",
    field: "ENG",
    label: "Горное дело и металлургия",
    localAxes: { E1: "пласт–завод", E2: "↓", E3: "~", E4: "поле/цех", E5: "↓" },
    differentiator: "Извлечение и переработка; тяжёлые условия, высокая цена ошибки",
  },
  {
    id: "ENG_AERO",
    field: "ENG",
    label: "Аэрокосмическая",
    localAxes: { E1: "аппарат", E2: "↓", E3: "движение ↑↑", E4: "лаб/КБ", E5: "↑" },
    differentiator: "Экстремальные требования к весу и надёжности; долгий цикл разработки",
  },
  {
    id: "ENG_BIO",
    field: "ENG",
    label: "Биоинженерия и медтехника",
    localAxes: { E1: "орган–прибор", E2: "↑↑", E3: "~", E4: "лаб", E5: "↑" },
    differentiator: "Единственная, где объект — живой организм или протез для него",
  },
  {
    id: "ENG_IND",
    field: "ENG",
    label: "Промышленная инженерия",
    localAxes: { E1: "завод–поток", E2: "↓", E3: "поток", E4: "цех/офис", E5: "↓" },
    differentiator: "Оптимизирует не деталь, а движение людей и материалов",
  },
  {
    id: "ENG_ENV",
    field: "ENG",
    label: "Экологическая инженерия",
    localAxes: { E1: "территория", E2: "↑", E3: "поток", E4: "поле", E5: "↓" },
    differentiator: "Инженерия ради ограничения вреда, а не ради продукта",
  },
  {
    id: "ENG_MAT",
    field: "ENG",
    label: "Материаловедение",
    localAxes: { E1: "молекула", E2: "~", E3: "статика", E4: "лаб", E5: "~" },
    differentiator: "Работает с веществом до того, как из него что-то сделали",
  },
  {
    id: "ENG_ROB",
    field: "ENG",
    label: "Мехатроника и робототехника",
    localAxes: { E1: "механизм", E2: "↓", E3: "движение ↑↑", E4: "лаб", E5: "↑↑" },
    differentiator: "Стык механики, электроники и кода; любит, когда железо слушается программу",
  },
];
