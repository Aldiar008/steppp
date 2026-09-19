import type { Specialization } from "../types";

/**
 * §3.2 — IT. Local axes: I1 БЛИЗОСТЬ К ЖЕЛЕЗУ, I2 ВИДИМОСТЬ РЕЗУЛЬТАТА,
 * I3 МАТЕМАТИКА, I4 ПРОТИВНИК, I5 ЛЮДИ.
 */
export const IT_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "IT_SWE",
    field: "IT",
    label: "Разработка ПО (back/front)",
    localAxes: { I1: "~", I2: "~", I3: "~", I4: "↓", I5: "~" },
    differentiator: "Базовая специальность поля; отличается отсутствием ярко выраженного уклона",
  },
  {
    id: "IT_MOB",
    field: "IT",
    label: "Мобильная разработка",
    localAxes: { I1: "~", I2: "видимый ↑", I3: "↓", I4: "↓", I5: "~" },
    differentiator: "Результат держат в руках; жёсткие рамки платформы",
  },
  {
    id: "IT_DS",
    field: "IT",
    label: "Data Science и ML",
    localAxes: { I1: "↓", I2: "↓", I3: "↑↑", I4: "↓", I5: "↓" },
    differentiator: "Единственная, где ответ вероятностный, а не «работает / не работает»",
  },
  {
    id: "IT_SEC",
    field: "IT",
    label: "Кибербезопасность",
    localAxes: { I1: "↑", I2: "↓", I3: "~", I4: "↑↑", I5: "~" },
    differentiator: "Есть живой противник; мышление «как это сломать»",
  },
  {
    id: "IT_OPS",
    field: "IT",
    label: "Системная инженерия и DevOps",
    localAxes: { I1: "↑", I2: "невидимый ↑↑", I3: "↓", I4: "~", I5: "↓" },
    differentiator: "Работа заметна только когда всё падает",
  },
  {
    id: "IT_DATA",
    field: "IT",
    label: "Дата-инженерия и базы данных",
    localAxes: { I1: "↓", I2: "↓", I3: "~", I4: "↓", I5: "↓" },
    differentiator: "Строит трубы для данных, а не выводы из них",
  },
  {
    id: "IT_GAME",
    field: "IT",
    label: "Разработка игр",
    localAxes: { I1: "~", I2: "видимый ↑↑", I3: "~", I4: "↓", I5: "↑" },
    differentiator: "Технология ради эмоции; сильное пересечение с ART",
  },
  {
    id: "IT_UX",
    field: "IT",
    label: "UX/UI и проектирование интерфейсов",
    localAxes: { I1: "↓", I2: "видимый ↑↑", I3: "↓", I4: "↓", I5: "↑↑" },
    differentiator: "Единственная в поле, где основной метод — разговор с пользователем",
  },
  {
    id: "IT_PM",
    field: "IT",
    label: "Продуктовый менеджмент",
    localAxes: { I1: "↓", I2: "~", I3: "↓", I4: "↓", I5: "↑↑" },
    differentiator: "Решает что делать, а не как; ответственность без прямой власти",
  },
  {
    id: "IT_EMB",
    field: "IT",
    label: "Встраиваемые системы и IoT",
    localAxes: { I1: "↑↑", I2: "~", I3: "↓", I4: "↓", I5: "↓" },
    differentiator: "Код, который живёт в физическом устройстве; ограничения памяти и питания",
  },
  {
    id: "IT_CV",
    field: "IT",
    label: "Компьютерное зрение и робототехническое ПО",
    localAxes: { I1: "↑", I2: "~", I3: "↑", I4: "↓", I5: "↓" },
    differentiator: "Мост между IT_DS и ENG_ROB",
  },
];
