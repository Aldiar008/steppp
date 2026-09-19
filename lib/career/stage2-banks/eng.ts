import type { Stage2Question } from "./types";

/** §6.2 — ENG bank (10), transcribed verbatim. */
export const ENG_BANK: readonly Stage2Question[] = [
  {
    id: "eng_1",
    field: "ENG",
    prompt:
      "Тебе дают выбор: проектировать мост, который простоит сто лет, или двигатель, который должен работать каждый день без остановки. Что интереснее?",
    axes: ["E3"],
    groupA: ["ENG_CIV"],
    groupB: ["ENG_MECH", "ENG_AERO"],
  },
  {
    id: "eng_2",
    field: "ENG",
    prompt: "Ты готов работать там, где объект нельзя увидеть глазами — только приборами? Ток, сигнал, поле.",
    axes: ["E5"],
    groupA: ["ENG_ELEC", "ENG_ROB"],
    groupB: ["ENG_CIV", "ENG_MECH"],
  },
  {
    id: "eng_3",
    field: "ENG",
    prompt: "Твой объект — живой человек, и от твоего расчёта зависит его тело. Это притягивает или пугает?",
    axes: ["E2"],
    groupA: ["ENG_BIO"],
    groupB: "rest",
  },
  {
    id: "eng_4",
    field: "ENG",
    prompt: "Полгода в вахтовом посёлке, хорошие деньги, связь плохая. Пойдёшь?",
    axes: ["E4"],
    groupA: ["ENG_PETRO", "ENG_MINE"],
    groupB: ["ENG_ELEC", "ENG_AERO"],
  },
  {
    id: "eng_5",
    field: "ENG",
    prompt: "Что тебе ближе: сделать одну деталь идеально, или сделать так, чтобы весь завод работал быстрее?",
    axes: ["E1"],
    groupA: ["ENG_MECH", "ENG_MAT"],
    groupB: ["ENG_IND"],
  },
  {
    id: "eng_6",
    field: "ENG",
    prompt: "Тебе интересно, почему металл ломается, или что из этого металла построить?",
    axes: ["E1"],
    groupA: ["ENG_MAT"],
    groupB: ["ENG_CIV", "ENG_MECH"],
  },
  {
    id: "eng_7",
    field: "ENG",
    prompt: "Хочешь, чтобы железо слушалось написанного тобой кода?",
    axes: ["E5"],
    groupA: ["ENG_ROB"],
    groupB: ["ENG_MECH"],
  },
  {
    id: "eng_8",
    field: "ENG",
    prompt:
      "Работа, где ты ограничиваешь чужое производство ради воздуха и воды. Ты будешь чувствовать себя правым или лишним?",
    axes: ["E1", "E2"],
    groupA: ["ENG_ENV"],
    groupB: "rest",
  },
  {
    id: "eng_9",
    field: "ENG",
    prompt: "Твоё изделие полетит через восемь лет после того, как ты начал. Выдержишь такой срок?",
    axes: ["A_HORIZON"],
    groupA: ["ENG_AERO"],
    groupB: ["ENG_MECH", "ENG_ELEC"],
  },
  {
    id: "eng_10",
    field: "ENG",
    prompt: "Тебе нравится, когда процесс идёт непрерывно и его надо удерживать, или когда есть начало и конец?",
    axes: ["E3"],
    groupA: ["ENG_CHEM", "ENG_PETRO"],
    groupB: ["ENG_CIV", "ENG_MECH"],
  },
];
