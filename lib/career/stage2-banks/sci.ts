import type { Stage2Question } from "./types";

/** §6.2 — SCI bank (9), transcribed verbatim. */
export const SCI_BANK: readonly Stage2Question[] = [
  {
    id: "sci_1",
    field: "SCI",
    prompt: "Ты хочешь понять, как устроено, или сделать из этого что-то полезное?",
    axes: ["S3"],
    groupA: ["SCI_MATH", "SCI_PHYS", "SCI_ASTRO"],
    groupB: ["SCI_BIOTECH", "SCI_STAT"],
  },
  {
    id: "sci_2",
    field: "SCI",
    prompt: "Сколько часов подряд ты готов работать руками у стола с приборами?",
    axes: ["S2"],
    groupA: ["SCI_CHEM", "SCI_BIO"],
    groupB: ["SCI_MATH", "SCI_ASTRO"],
  },
  {
    id: "sci_3",
    field: "SCI",
    prompt:
      "Твой объект сам меняется, растёт и умирает, эксперимент идёт три недели и может сорваться. Это нормально?",
    axes: ["S1", "S2"],
    groupA: ["SCI_BIO", "SCI_NEURO"],
    groupB: ["SCI_PHYS", "SCI_CHEM"],
  },
  {
    id: "sci_4",
    field: "SCI",
    prompt: "Тебя тянет к тому, что нельзя потрогать в принципе — звёзды, числа, поля?",
    axes: ["S1"],
    groupA: ["SCI_ASTRO", "SCI_MATH"],
    groupB: ["SCI_CHEM", "SCI_BIO"],
  },
  {
    id: "sci_5",
    field: "SCI",
    prompt: "Работать одному много часов подряд — это отдых или наказание?",
    axes: ["S4"],
    groupA: ["SCI_MATH"],
    groupB: ["SCI_BIOTECH", "SCI_NEURO"],
  },
  {
    id: "sci_6",
    field: "SCI",
    prompt: "Тебе интереснее сам метод анализа или предмет, к которому его применяют?",
    axes: ["S3"],
    groupA: ["SCI_STAT"],
    groupB: "rest",
  },
  {
    id: "sci_7",
    field: "SCI",
    prompt: "Готов к экспедициям и измерениям в поле?",
    axes: ["S2"],
    groupA: ["SCI_GEOPH"],
    groupB: ["SCI_PHYS"],
  },
  {
    id: "sci_8",
    field: "SCI",
    prompt: "Что ближе: мозг как орган или мозг как источник поведения?",
    axes: ["S1"],
    groupA: ["SCI_NEURO"],
    groupB: ["SCI_BIO"],
  },
  {
    id: "sci_9",
    field: "SCI",
    prompt: "Тебе важно, чтобы результат твоей работы кто-то применил при твоей жизни?",
    axes: ["S3", "A_HORIZON"],
    groupA: ["SCI_BIOTECH", "SCI_STAT"],
    groupB: ["SCI_MATH", "SCI_ASTRO"],
  },
];
