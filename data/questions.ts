/**
 * The questions the interview is allowed to ask.
 *
 * Ten, of which a given applicant sees five to seven: the selector asks only
 * the ones whose answer would actually move their board, and stops when none
 * would. A form with thirty fields is not thoroughness, it is a way of making
 * somebody prove they deserve an answer.
 *
 * Each option carries the profile value it stands for, so there is one place
 * where "до 1 500 000 ₸" means `{ amount: 1_500_000, currency: "KZT" }` — the
 * label and the value cannot drift apart, and the same value is what the
 * selector tries when it measures influence.
 *
 * `importance` is authored and used only to break a tie between two questions
 * that move the board equally. It is never added to the influence score, so an
 * opinion in this file can never outrank a measurement.
 */
import { PROGRAMS } from "@/data/catalog";
import { countryName } from "@/data/countries";
import type { QuestionDefinition, QuestionOption } from "@/lib/engine/questions";

/**
 * The countries the catalogue actually covers, in the order they matter.
 *
 * Generated from the programmes rather than typed out. A hand-written list goes
 * stale the moment a university is added: the applicant is then offered eight
 * countries while the board quietly holds nineteen, and the two screens
 * disagree about what the product knows.
 *
 * Countries are a preference, not a filter — a route in a country nobody named
 * still appears on the board, it just does not get the "есть в твоём списке"
 * reason. So a longer list costs nothing and hides nothing.
 */
function countryOptions(): readonly QuestionOption<string>[] {
  const counts = new Map<string, number>();
  for (const program of PROGRAMS) {
    counts.set(program.country, (counts.get(program.country) ?? 0) + 1);
  }

  return [...counts.entries()]
    // Most-covered first, then by code — never by insertion order, so the
    // screen is the same on every render and in every test.
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0] < b[0] ? -1 : 1))
    .map(([code, count]) => ({
      value: code,
      label: countryName(code),
      hint: `${count} ${plural(count)} в каталоге`,
      to: code,
    }));
}

/** 1 вуз, 2 вуза, 5 вузов. */
function plural(count: number): string {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return "вузов";
  const last = count % 10;
  if (last === 1) return "вуз";
  if (last >= 2 && last <= 4) return "вуза";
  return "вузов";
}

export const QUESTION_CATALOG: readonly QuestionDefinition[] = [
  {
    id: "q_interests",
    field: "interests",
    type: "multi",
    title: "Что тебе интересно?",
    hint: "Выбери одно или несколько направлений. Потом это можно поменять.",
    importance: 5,
    options: [
      { value: "cs", label: "IT и информатика", to: "computer_science" },
      { value: "engineering", label: "Инженерия", to: "engineering" },
      { value: "medicine", label: "Медицина", to: "medicine" },
      { value: "natural_sciences", label: "Естественные науки", to: "natural_sciences" },
      { value: "business", label: "Бизнес", to: "business" },
      { value: "economics", label: "Экономика", to: "economics" },
      { value: "law", label: "Право", to: "law" },
      { value: "humanities", label: "Гуманитарные науки", to: "humanities" },
      { value: "design", label: "Дизайн и искусство", to: "design" },
      { value: "education", label: "Педагогика", to: "education" },
    ],
  },
  {
    id: "q_countries",
    field: "countries",
    type: "multi",
    title: "Куда ты хочешь поступать?",
    hint: "Страны, которые ты сам рассматриваешь. Остальные останутся на доске.",
    importance: 4,
    options: countryOptions(),
  },
  {
    id: "q_full_funding",
    field: "constraints.needs_full_funding",
    type: "boolean",
    title: "Нужен ли полный грант?",
    hint: "Если учёбу и жильё обязательно должен покрывать грант — скажи об этом сразу.",
    importance: 5,
    options: [
      { value: "yes", label: "Да, только с полным финансированием", to: true },
      { value: "no", label: "Нет, часть расходов семья потянет", to: false },
    ],
  },
  {
    id: "q_budget",
    field: "budget_per_year",
    type: "scale",
    currency: "KZT",
    // Up to twenty million a year covers everything in the catalogue and more;
    // the step is fifty thousand because nobody plans a budget to the tenge.
    scale: { min: 0, max: 20_000_000, step: 50_000, unit: "₸ в год", default: 1_500_000 },
    title: "Сколько семья готова платить за год?",
    hint: "Поставь свою сумму или возьми ближайшую. Приблизительно — нормально.",
    importance: 4,
    options: [
      {
        value: "kzt_500k",
        label: "До 500 000 ₸",
        to: { amount: 500_000, currency: "KZT" },
      },
      {
        value: "kzt_1_5m",
        label: "До 1 500 000 ₸",
        to: { amount: 1_500_000, currency: "KZT" },
      },
      {
        value: "kzt_3m",
        label: "До 3 000 000 ₸",
        to: { amount: 3_000_000, currency: "KZT" },
      },
      {
        value: "usd_10k",
        label: "До 10 000 $",
        to: { amount: 10_000, currency: "USD" },
      },
    ],
  },
  {
    id: "q_language_en",
    field: "languages",
    type: "single",
    title: "Как у тебя с английским?",
    hint: "Это условие допуска на программах с обучением на английском.",
    importance: 5,
    options: [
      { value: "en_b2", label: "Свободно читаю и говорю (B2+)", to: { code: "en", level: "B2" } },
      { value: "en_b1", label: "Средне, с трудом (B1)", to: { code: "en", level: "B1" } },
      { value: "ru", label: "Английского пока нет", to: { code: "ru", level: "C1" } },
    ],
  },
  {
    id: "q_language_second",
    field: "languages",
    type: "single",
    title: "Есть ещё язык, на котором ты можешь учиться?",
    hint: "Немецкий или турецкий открывают отдельные наборы программ.",
    importance: 2,
    options: [
      { value: "kk", label: "Казахский", hint: "открывает казахстанские программы", to: { code: "kk", level: "C1" } },
      { value: "de", label: "Немецкий", hint: "немецкие вузы учат на нём", to: { code: "de", level: "B1" } },
      { value: "tr", label: "Турецкий", to: { code: "tr", level: "B1" } },
      { value: "fr", label: "Французский", to: { code: "fr", level: "B1" } },
    ],
  },
  {
    id: "q_exam_ent",
    field: "exams",
    type: "scale",
    exam_id: "ent",
    // The ЕНТ is scored out of 140. Anything else would be our invention.
    scale: { min: 0, max: 140, step: 1, unit: "баллов", default: 100 },
    title: "Что с ЕНТ?",
    hint: "Уже сдал — поставь свой балл. Он сразу закрывает требование там, где оно есть.",
    importance: 4,
    options: [{ value: "ent_planned", label: "Ещё не сдавал", to: { id: "ent", status: "planned" } }],
  },
  {
    id: "q_exam_ielts",
    field: "exams",
    type: "scale",
    exam_id: "ielts",
    // IELTS is a band from 1.0 to 9.0 in half-steps. A product that offers
    // "6 или выше" throws away the difference between 6.5 and 8.0.
    scale: { min: 1, max: 9, step: 0.5, unit: "балл IELTS", default: 6.5 },
    title: "Какой у тебя балл IELTS?",
    hint: "Ставь ровно тот, что в сертификате. TOEFL и другие экзамены спросим отдельно.",
    importance: 3,
    options: [
      { value: "ielts_planned", label: "Ещё не сдавал", to: { id: "ielts", status: "planned" } },
    ],
  },
  {
    id: "q_exam_sat",
    field: "exams",
    type: "scale",
    exam_id: "sat",
    // SAT runs 400-1600 in steps of ten.
    scale: { min: 400, max: 1_600, step: 10, unit: "баллов SAT", default: 1_200 },
    title: "Какой у тебя балл SAT?",
    hint: "Нужен для части зарубежных программ. Не сдавал — так и скажи.",
    importance: 3,
    options: [{ value: "sat_planned", label: "Ещё не сдавал", to: { id: "sat", status: "planned" } }],
  },
  {
    id: "q_exam_toefl",
    field: "exams",
    type: "scale",
    exam_id: "toefl",
    // TOEFL iBT runs 0-120.
    scale: { min: 0, max: 120, step: 1, unit: "баллов TOEFL", default: 90 },
    title: "Какой у тебя балл TOEFL?",
    hint: "Если сдавал TOEFL вместо IELTS.",
    importance: 2,
    options: [{ value: "toefl_planned", label: "Не сдавал", to: { id: "toefl", status: "planned" } }],
  },
  {
    id: "q_relocate",
    field: "constraints.can_relocate",
    type: "boolean",
    title: "Готов ли ты уехать из страны?",
    hint: "Если переезд невозможен, зарубежные программы не будут тебя отвлекать.",
    importance: 3,
    options: [
      { value: "yes", label: "Да, готов", to: true },
      { value: "no", label: "Нет, остаюсь в Казахстане", to: false },
    ],
  },
  {
    id: "q_grade",
    field: "grade",
    type: "single",
    title: "В каком ты классе?",
    importance: 2,
    options: [
      { value: "10", label: "10 класс", to: 10 },
      { value: "11", label: "11 класс", to: 11 },
      { value: "12", label: "12 класс или уже выпустился", to: 12 },
    ],
  },
];
