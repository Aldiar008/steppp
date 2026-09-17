import type { ExplainRequest, Explanation } from "./schema";

/**
 * The guard and the fallback prose.
 *
 * Kept out of the route handler so both are plain, testable functions with no
 * server-only imports. The route stays thin: parse, call, guard, respond.
 */

/**
 * Last line of defence against an invented number.
 *
 * The prompt forbids it and the schema removes the obvious places to put one,
 * but prose is prose. Every digit in the answer must appear somewhere in the
 * facts we sent. A model that slips a plausible deadline into a sentence is the
 * single worst failure this product can have, so falling back to the template
 * is cheaper than trusting three layers of instruction.
 */
export function rejectInventedNumbers(explanation: Explanation, facts: ExplainRequest): boolean {
  const allowed = new Set<string>();
  const remember = (value: string | number | null) => {
    if (value === null) return;
    for (const token of String(value).match(/\d+/g) ?? []) allowed.add(token);
  };

  remember(facts.daysLeft);
  remember(facts.bindingLeadTimeDays);
  remember(facts.pointOfNoReturn);
  remember(facts.bindingStep);
  remember(facts.doorTitle);
  for (const factor of facts.fitFactors) {
    remember(factor.label);
    remember(factor.detail);
  }
  for (const blocker of facts.blockers) remember(blocker);

  const used = `${explanation.headline} ${explanation.body}`.match(/\d+/g) ?? [];
  return used.every((token) => allowed.has(token));
}

/** Deterministic prose. Used with no API key, on failure, and on guard rejection. */
export function templateExplanation(facts: ExplainRequest): Explanation {
  if (facts.status === "blocked") {
    return {
      headline: `Путь «${facts.doorTitle}» сейчас недоступен по условиям профиля.`,
      body: `${facts.blockers[0] ?? "Условия профиля не совпадают с требованиями этого пути."} Это ограничение снимается изменением ответа, а не временем: поменяй соответствующий пункт в профиле и посмотри экран «Что изменилось».`,
    };
  }

  if (facts.status === "closed") {
    return {
      headline: `Путь «${facts.doorTitle}» уже нельзя пройти к выбранному году.`,
      body: "Ближайший обязательный шаг требует больше времени, чем осталось до его дедлайна. Это не значит, что путь закрыт навсегда: смени год поступления, и расчёт пересоберётся.",
    };
  }

  const pressure =
    facts.status === "critical"
      ? "Запас времени почти исчерпан."
      : facts.status === "at_risk"
        ? "Запас времени ещё есть, но он небольшой."
        : "Времени пока достаточно.";

  const why =
    facts.bindingStep && facts.bindingLeadTimeDays !== null
      ? `Всё держится на шаге «${facts.bindingStep}»: на него уходит около ${facts.bindingLeadTimeDays} дней, поэтому он и определяет дату закрытия пути.`
      : "Все обязательные шаги по этому пути уже закрыты.";

  const fit = facts.fitFactors
    .slice(0, 2)
    .map((f) => f.label.toLowerCase())
    .join(", ");

  return {
    headline: `${pressure} Путь «${facts.doorTitle}» пока открыт.`,
    body: `${why}${fit ? ` Совпадение с твоим профилем держится на том, что ${fit}.` : ""} Дату перед подачей сверь на сайте программы: вузы иногда сдвигают календарь.`,
  };
}
