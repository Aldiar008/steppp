import type { AxisId, FacetId, FieldId } from "./types";

/**
 * Part 4 — the ten fixed questions, transcribed verbatim (wording, option
 * order, and every numeric shift). Asked in this exact order for every
 * student; the general presentation rules ("один вопрос на экран", "не
 * понимаю вопрос", "не знаю" is legal and skips rather than blocks) live in
 * the UI layer, not here — this file only holds content and scoring shifts.
 */

export interface Stage1Shift {
  dimension: FacetId | AxisId;
  amount: number;
}

export interface Stage1Option {
  value: string;
  label: string;
  shifts?: readonly Stage1Shift[];
  /**
   * Q3's "движение/спорт/горы/улица" option names the field `SEC` directly
   * ("→ `A_PHYS` +35, `SEC` +15") rather than another axis — the document's
   * own text, not an invented mechanism. Applied in `scoring.ts` as a small
   * direct addition to that field's score, on top of (not instead of) the
   * vector-similarity comparison.
   */
  fieldBonus?: Partial<Record<FieldId, number>>;
  /**
   * Q7's third option is the document's own example of a fixed-choice veto
   * ("не должны попадать в выдачу человеку, который выбрал третий
   * вариант") — the exact same hard-filter mechanism as the Q10 AVERSIONS
   * map, just triggered by a choice instead of free text.
   */
  vetoedIds?: readonly string[];
  /** No usable signal at all — chosen on purpose, still legal. */
  noSignal?: boolean;
}

export type Stage1Question =
  | { id: string; kind: "text"; prompt: string; fallbackPrompt: string }
  | { id: string; kind: "single"; prompt: string; options: readonly Stage1Option[] }
  | {
      id: string;
      kind: "single_with_text";
      prompt: string;
      options: readonly Stage1Option[];
      followupPrompt: string;
    }
  | { id: string; kind: "multi"; prompt: string; maxSelect: number; options: readonly Stage1Option[] }
  | { id: string; kind: "text_with_chips"; prompt: string; chips: readonly string[] };

export const STAGE1_QUESTIONS: readonly Stage1Question[] = [
  {
    id: "q1_absorbed",
    kind: "text",
    prompt:
      "Вспомни последний раз, когда ты залип на чём-то так, что забыл про время. Что это было? Расскажи в двух-трёх предложениях — что именно ты делал.",
    fallbackPrompt:
      "Ладно, тогда наоборот: что ты делал в последний месяц и тебе было скучно настолько, что ты бросил?",
  },
  {
    id: "q2_broken_thing",
    kind: "single",
    prompt: "У тебя в руках вещь, которая перестала работать. Что ты сделаешь первым?",
    options: [
      {
        value: "disassemble",
        label: "Разберу и посмотрю, что внутри",
        shifts: [
          { dimension: "O_MATTER", amount: 25 },
          { dimension: "A_ABS", amount: -20 },
          { dimension: "A_NEW", amount: -15 },
        ],
      },
      {
        value: "find_instructions",
        label: "Найду инструкцию или видео, как чинят такие",
        shifts: [
          { dimension: "O_DATA", amount: 15 },
          { dimension: "A_PREC", amount: 20 },
        ],
      },
      {
        value: "give_away",
        label: "Отдам тому, кто умеет, займусь своим делом",
        shifts: [
          { dimension: "O_MATTER", amount: -15 },
          { dimension: "A_PHYS", amount: -15 },
        ],
      },
      {
        value: "buy_new",
        label: "Куплю новую, если это дешевле возни",
        shifts: [
          { dimension: "O_SYSTEM", amount: 15 },
          { dimension: "A_HORIZON", amount: -20 },
        ],
      },
      {
        value: "repurpose",
        label: "Придумаю, как сделать из неё что-то другое",
        shifts: [
          { dimension: "O_IMAGE", amount: 20 },
          { dimension: "A_NEW", amount: 30 },
        ],
      },
    ],
  },
  {
    id: "q3_free_saturday",
    kind: "multi",
    prompt: "Целая суббота свободна, деньги на что угодно есть, никто не проверит. Куда ты её денешь?",
    maxSelect: 2,
    options: [
      {
        value: "finish_started",
        label: "Доделаю то, что начал и забросил",
        shifts: [
          { dimension: "A_PREC", amount: 20 },
          { dimension: "A_STAB", amount: -10 },
        ],
      },
      {
        value: "learn_something",
        label: "Разберусь в чём-то новом просто из интереса",
        shifts: [
          { dimension: "A_ABS", amount: 25 },
          { dimension: "O_DATA", amount: 15 },
        ],
      },
      {
        value: "gather_friends",
        label: "Соберу друзей и куда-нибудь вытащу",
        shifts: [
          { dimension: "A_SOC", amount: 30 },
          { dimension: "A_INFL", amount: 20 },
        ],
      },
      {
        value: "hands_on",
        label: "Что-нибудь сделаю руками",
        shifts: [
          { dimension: "A_PHYS", amount: 30 },
          { dimension: "O_MATTER", amount: 20 },
        ],
      },
      {
        value: "create",
        label: "Буду рисовать, писать, монтировать, играть музыку",
        shifts: [
          { dimension: "O_IMAGE", amount: 30 },
          { dimension: "A_NEW", amount: 25 },
        ],
      },
      {
        value: "move",
        label: "Буду двигаться: спорт, горы, улица",
        shifts: [{ dimension: "A_PHYS", amount: 35 }],
        fieldBonus: { SEC: 15 },
      },
      { value: "rest", label: "Ничего, просто отдохну", noSignal: true },
    ],
  },
  {
    id: "q4_less_annoying_task",
    kind: "single",
    prompt:
      "Обе задачи надо сделать до вечера. Какую возьмёшь первой?\nА. Найти ошибку в чужой таблице на 500 строк — она точно там есть.\nБ. Придумать, как объяснить сложную тему человеку, который в ней ничего не понимает.",
    options: [
      {
        value: "a",
        label: "А. Найти ошибку в таблице",
        shifts: [
          { dimension: "O_DATA", amount: 25 },
          { dimension: "A_PREC", amount: 30 },
          { dimension: "A_SOC", amount: -20 },
        ],
      },
      {
        value: "b",
        label: "Б. Объяснить сложную тему",
        shifts: [
          { dimension: "O_PEOPLE", amount: 30 },
          { dimension: "A_SOC", amount: 25 },
          { dimension: "O_IMAGE", amount: 10 },
        ],
      },
    ],
  },
  {
    id: "q5_workday",
    kind: "single",
    prompt: "Через десять лет — обычный вторник. Где ты находишься большую часть дня?",
    options: [
      {
        value: "desk",
        label: "За столом, экран, тихо",
        shifts: [
          { dimension: "A_PHYS", amount: -40 },
          { dimension: "A_SOC", amount: -20 },
        ],
      },
      {
        value: "people",
        label: "Среди людей, всё время разговоры",
        shifts: [
          { dimension: "A_SOC", amount: 40 },
          { dimension: "O_PEOPLE", amount: 25 },
        ],
      },
      {
        value: "on_feet",
        label: "На ногах, в движении, объект вокруг меня",
        shifts: [
          { dimension: "A_PHYS", amount: 40 },
          { dimension: "O_MATTER", amount: 20 },
        ],
      },
      {
        value: "lab",
        label: "В лаборатории или мастерской",
        shifts: [
          { dimension: "A_PHYS", amount: 15 },
          { dimension: "O_MATTER", amount: 20 },
          { dimension: "A_PREC", amount: 25 },
        ],
      },
      {
        value: "varied",
        label: "Каждый день в другом месте",
        shifts: [{ dimension: "A_STAB", amount: 40 }],
      },
      {
        value: "outdoors",
        label: "На улице, вне помещения",
        shifts: [
          { dimension: "A_PHYS", amount: 45 },
          { dimension: "O_LIFE", amount: 15 },
        ],
      },
    ],
  },
  {
    id: "q6_end_result",
    kind: "single",
    prompt: "Ты закончил большую работу. Что лежит перед тобой?",
    options: [
      {
        value: "physical_thing",
        label: "Вещь, которую можно потрогать",
        shifts: [
          { dimension: "O_MATTER", amount: 30 },
          { dimension: "A_ABS", amount: -35 },
        ],
      },
      {
        value: "software",
        label: "Работающая программа или система",
        shifts: [
          { dimension: "O_DATA", amount: 30 },
          { dimension: "A_ABS", amount: 25 },
        ],
      },
      {
        value: "helped_person",
        label: "Человек, которому стало лучше",
        shifts: [
          { dimension: "O_PEOPLE", amount: 40 },
          { dimension: "A_SCALE", amount: -30 },
        ],
      },
      {
        value: "answer",
        label: "Ответ на вопрос, которого раньше не знали",
        shifts: [
          { dimension: "O_DATA", amount: 20 },
          { dimension: "A_ABS", amount: 45 },
          { dimension: "A_HORIZON", amount: 35 },
        ],
      },
      {
        value: "media",
        label: "Что-то, что смотрят, читают или слушают",
        shifts: [
          { dimension: "O_IMAGE", amount: 40 },
          { dimension: "A_NEW", amount: 30 },
        ],
      },
      {
        value: "deal",
        label: "Договорённость, сделка или решение",
        shifts: [
          { dimension: "O_SYSTEM", amount: 35 },
          { dimension: "A_INFL", amount: 30 },
        ],
      },
    ],
  },
  {
    id: "q7_cost_of_error",
    kind: "single_with_text",
    prompt:
      "Представь: в твоей работе ошибка стоит дорого. Не «переделать», а по-настоящему дорого — здоровье, деньги, чья-то безопасность. Как тебе такая мысль?",
    followupPrompt: "Можешь рассказать чуть подробнее, если хочешь — это необязательно.",
    options: [
      {
        value: "fine_with_rules",
        label: "Нормально, если есть чёткие правила и я их знаю",
        shifts: [
          { dimension: "A_PREC", amount: 40 },
          { dimension: "A_STAB", amount: 20 },
        ],
      },
      {
        value: "prefer_high_stakes",
        label: "Нормально, мне даже интереснее, когда ставка высокая",
        shifts: [
          { dimension: "A_RISK", amount: 40 },
          { dimension: "A_PREC", amount: 20 },
        ],
      },
      {
        value: "would_not_want_it",
        label: "Тяжело, я бы не хотел так жить",
        shifts: [
          { dimension: "A_PREC", amount: -20 },
          { dimension: "A_RISK", amount: -35 },
        ],
        // §4, Q7: "MED_SURG, TRD_PILOT, TRD_AVTECH, SEC_* не должны попадать
        // в выдачу человеку, который выбрал третий вариант" — a fixed-choice
        // veto, same mechanism as the Q10 AVERSIONS map (see aversions.ts).
        vetoedIds: [
          "MED_SURG",
          "TRD_PILOT",
          "TRD_AVTECH",
          "SEC_MIL",
          "SEC_FIRE",
          "SEC_POL",
          "SEC_FOREN",
          "SEC_HSE",
          "SEC_COACH",
          "SEC_ATHL",
          "SEC_SPSCI",
          "SEC_EMERG",
          "SEC_GUARD",
        ],
      },
      { value: "never_thought", label: "Никогда об этом не думал", noSignal: true },
    ],
  },
  {
    id: "q8_people_mode",
    kind: "single",
    prompt: "В работе тебе придётся иметь дело с людьми. Какой вариант ближе?",
    options: [
      {
        value: "few_deep",
        label: "Мало людей, зато свои, и глубоко в деле",
        shifts: [
          { dimension: "A_SOC", amount: -25 },
          { dimension: "A_INFL", amount: -15 },
        ],
      },
      {
        value: "many_brief",
        label: "Много разных людей каждый день, коротко",
        shifts: [
          { dimension: "A_SOC", amount: 35 },
          { dimension: "A_STAB", amount: 20 },
        ],
      },
      {
        value: "one_long",
        label: "Один человек, но долго и всерьёз — я ему помогаю",
        shifts: [
          { dimension: "O_PEOPLE", amount: 40 },
          { dimension: "A_SCALE", amount: -40 },
          { dimension: "A_HORIZON", amount: 25 },
        ],
      },
      {
        value: "persuade_lead",
        label: "Люди, которых надо убедить и повести",
        shifts: [
          { dimension: "A_INFL", amount: 45 },
          { dimension: "O_SYSTEM", amount: 20 },
        ],
      },
      {
        value: "fewer_better",
        label: "Честно — чем меньше, тем лучше",
        shifts: [{ dimension: "A_SOC", amount: -45 }],
      },
    ],
  },
  {
    id: "q9_horizon",
    kind: "single",
    prompt:
      "Что для тебя тяжелее?\nА. Делать что-то, результат чего увидишь через пять лет.\nБ. Делать одно и то же каждый день, зато результат виден сразу.",
    options: [
      {
        value: "a_harder",
        label: "А тяжелее",
        shifts: [
          { dimension: "A_HORIZON", amount: -35 },
          { dimension: "A_STAB", amount: -10 },
        ],
      },
      {
        value: "b_harder",
        label: "Б тяжелее",
        shifts: [
          { dimension: "A_HORIZON", amount: 35 },
          { dimension: "A_STAB", amount: -30 },
        ],
      },
      { value: "both_fine", label: "Оба нормально", noSignal: true },
    ],
  },
  {
    id: "q10_dealbreaker",
    kind: "text_with_chips",
    prompt:
      "Назови одну вещь, которой в твоей будущей работе точно быть не должно. Что угодно — кровь, публичные выступления, сидеть весь день, командировки, форма, работа с детьми.",
    chips: [
      "кровь",
      "публичные выступления",
      "сидеть весь день",
      "командировки",
      "форма и подчинение",
      "работа с детьми",
      "математика",
      "вахта",
    ],
  },
];

/** §4.1 — asked only when more than three candidates survive Q10. */
export const STAGE1_OPTIONAL_QUESTIONS: readonly Stage1Question[] = [
  {
    id: "q11_money_freedom",
    kind: "single",
    prompt:
      "Что важнее в первые пять лет после учёбы: понятная зарплата каждый месяц, или шанс на большее, но без гарантий?",
    options: [
      { value: "steady", label: "Понятная зарплата каждый месяц", shifts: [{ dimension: "A_RISK", amount: -40 }] },
      { value: "upside", label: "Шанс на большее, но без гарантий", shifts: [{ dimension: "A_RISK", amount: 40 }] },
    ],
  },
  {
    id: "q12_scale_of_help",
    kind: "single",
    prompt:
      "Лучше помочь одному человеку так, что он это запомнит на всю жизнь, или сделать что-то, что чуть-чуть улучшит жизнь тысячам, но никто не узнает твоё имя?",
    options: [
      { value: "one_person", label: "Помочь одному человеку так, чтобы он запомнил", shifts: [{ dimension: "A_SCALE", amount: -40 }] },
      { value: "many_people", label: "Чуть-чуть улучшить жизнь тысячам", shifts: [{ dimension: "A_SCALE", amount: 40 }] },
    ],
  },
];

export function findStage1Question(id: string): Stage1Question | undefined {
  return [...STAGE1_QUESTIONS, ...STAGE1_OPTIONAL_QUESTIONS].find((question) => question.id === id);
}
