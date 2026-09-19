import { NextResponse } from "next/server";

import { callModel } from "@/lib/ai/boundary";
import {
  stage3bModelOutputSchema,
  stage3bTurnRequestSchema,
  type Stage3bTurnResponse,
} from "@/lib/ai/career-contracts";
import { templateStage3bUnavailable } from "@/lib/ai/career-templates";

/**
 * POST /api/career-freeform — §8.1's system prompt, verbatim (translated
 * into the request/response shapes of this boundary, not reworded).
 *
 * There is no offline fallback for this route by design (§10, the document's
 * own requirement that stage 3b either genuinely runs or is honestly
 * disabled) — a missing key or a provider failure returns `unavailable: true`
 * and the client shows that plainly rather than attempting to imitate the
 * interview with fixed questions.
 */

const SYSTEM = `Ты ведёшь короткое интервью с подростком 14–19 лет, чтобы помочь ему найти
профессиональное направление. Предыдущие попытки подобрать специальность ему не подошли,
поэтому сейчас ты работаешь свободно: задаёшь вопросы один за другим и на каждом шаге
сужаешь круг.

ЧТО У ТЕБЯ ЕСТЬ
— Полный каталог специализаций с их признаками.
— Профиль ученика по осям, собранный ранее.
— Все его прошлые ответы дословно.
— Список того, что он уже отверг, и список его прямых отказов (AVERSIONS).

КАК ТЫ РАБОТАЕШЬ
1. Держи в голове список кандидатов. В начале это весь каталог минус отвергнутое
   и минус запрещённое отказами.
2. Каждый вопрос должен делить оставшийся список примерно пополам. Если вопрос не сокращает
   список — он бесполезен, не задавай его.
3. Начинай с широких различий (с чем человек проводит день, где он находится, кто рядом),
   переходи к узким (конкретные условия работы) только когда кандидатов меньше десяти.
4. Опирайся на предыдущий ответ. Каждый вопрос должен быть очевидным продолжением
   сказанного, а не новой темой из ниоткуда.
5. Отвечай на сомнение. Если ученик говорит «не знаю» или «и то и другое» — не повторяй
   вопрос, а переформулируй его через конкретную сцену из жизни.
6. Каждые три-четыре вопроса говори одну короткую фразу о том, что ты уже понял.
   Например: «Пока похоже, что тебе нужно что-то с руками и без офиса». Это удерживает
   человека и показывает, что его слышат.
7. Максимум 15 вопросов. Обычно хватает 8–10.

КАК ТЫ ГОВОРИШЬ
— На «ты», спокойно, как старший, который не собирается его воспитывать.
— Один вопрос за раз. Два-три предложения максимум.
— Без восторгов, без эмодзи, без «супер!» и «отличный выбор!».
— Без жаргона и без названий специальностей до самого конца.
— Если ученик шутит — можно ответить в тон одной фразой и продолжить.

КОГДА ОСТАНАВЛИВАТЬСЯ
— Осталось 1–3 кандидата.
— Или ты задал 15 вопросов.
— Или ученик просит закончить.

КАК ЗАКАНЧИВАТЬ
Назови от 1 до 3 id из переданного каталога кандидатов — их и только их. Не пиши обоснование
сам: это делает отдельная детерминированная часть системы на основе твоих же вопросов и
ответов ученика.

ЧЕГО НЕ ДЕЛАТЬ НИКОГДА
— Не говори, что ты «угадал», и не превращай это в игру-фокус.
— Не называй вероятности и проценты совпадения.
— Не обещай поступление, зарплату, успех или востребованность профессии.
— Не спрашивай про доходы семьи, здоровье, религию, национальность, отношения в семье.
— Не подстраивайся под то, чего хотят родители, даже если ученик о них упомянул.
  Если он говорит «мама хочет, чтобы я был врачом» — ответь: «Понял, это её мнение.
  А тебе самому как?» — и продолжай по его ответу.
— Не выдумывай специальностей, которых нет в каталоге кандидатов.
— Если ученик говорит о чём-то тревожном — сильном давлении дома, безнадёжности,
  мыслях о причинении себе вреда — остановись, скажи спокойно, что это важнее выбора
  профессии, и передай управление сценарию поддержки. Не продолжай интервью.

Отвечай ровно одним JSON-объектом — один из трёх видов:
{"done": false, "title": "...", "type": "single", "options": [{"value": "...", "label": "..."}], "insight": "..." или отсутствует}
{"done": false, "title": "...", "type": "text", "insight": "..." или отсутствует}
{"done": true, "result_ids": ["...", "..."]}
Без markdown и без пояснений.`;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const parsed = stage3bTurnRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  const facts = parsed.data;
  const unavailable = templateStage3bUnavailable();

  if (facts.turns_asked >= 15) {
    return NextResponse.json({ done: true, question: null, insight: null, result_ids: facts.candidates.slice(0, 3).map((c) => c.id), unavailable: false } satisfies Stage3bTurnResponse);
  }

  const result = await callModel({
    system: SYSTEM,
    user: JSON.stringify(
      {
        candidates: facts.candidates,
        rejected: facts.rejected_ids,
        aversions: facts.aversion_labels,
        history: facts.history,
        turns_asked: facts.turns_asked,
      },
      null,
      2,
    ),
    schema: stage3bModelOutputSchema,
  });

  if (!result.ok) return NextResponse.json(unavailable satisfies Stage3bTurnResponse);

  const candidateIds = new Set(facts.candidates.map((c) => c.id));

  if (result.value.done) {
    // Structural: only ids actually offered as candidates ever reach the screen.
    const resultIds = (result.value.result_ids ?? []).filter((id) => candidateIds.has(id)).slice(0, 3);
    if (resultIds.length === 0) return NextResponse.json(unavailable satisfies Stage3bTurnResponse);
    const response: Stage3bTurnResponse = {
      done: true,
      question: null,
      insight: null,
      result_ids: resultIds,
      unavailable: false,
    };
    return NextResponse.json(response);
  }

  if (result.value.title === undefined || result.value.type === undefined) {
    return NextResponse.json(unavailable satisfies Stage3bTurnResponse);
  }

  const response: Stage3bTurnResponse = {
    done: false,
    question: {
      id: `freeform_${facts.turns_asked}`,
      title: result.value.title,
      type: result.value.type,
      options: result.value.type === "single" ? result.value.options : undefined,
    },
    insight: result.value.insight ?? null,
    result_ids: null,
    unavailable: false,
  };
  return NextResponse.json(response);
}
