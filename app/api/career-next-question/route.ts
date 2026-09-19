import { NextResponse } from "next/server";

import { callModel } from "@/lib/ai/boundary";
import {
  stage2ModelOutputSchema,
  stage2QuestionRequestSchema,
  type Stage2QuestionResponse,
} from "@/lib/ai/career-contracts";
import { templateStage2Question } from "@/lib/ai/career-templates";
import { isFieldId } from "@/lib/career/fields";

/**
 * POST /api/career-next-question — §6.3's system prompt, dословно.
 *
 * The model may only ever choose a question already in `bank` (the field's
 * own not-yet-asked bank entries) — it never authors a new one here. If the
 * bank is exhausted, the caller does not reach this route at all (see
 * `use-career-interview.ts`): stage 2 simply ends, the same as when the
 * model itself would run out of good questions to ask.
 */

const SYSTEM = `Ты — интервьюер, помогающий подростку 14–19 лет понять, какая специальность ему подходит.
Твоя задача на этом шаге — выбрать ОДИН следующий вопрос. Не два, не список.

ТЕБЕ ДАНО:
— профиль ученика (оси и их значения),
— его дословные ответы на предыдущие вопросы,
— список оставшихся кандидатов-специализаций с их признаками,
— банк доступных вопросов с пометками, какие специализации каждый вопрос разделяет,
— список уже заданных вопросов и список запретных тем из AVERSIONS.

КАК ВЫБИРАТЬ:
1. Посмотри на оставшихся кандидатов и найди признак, по которому они расходятся сильнее всего.
2. Выбери из банка вопрос, который бьёт именно по этому признаку и делит список ближе всего к пополам.
3. Никогда не выбирай вопрос, на который все оставшиеся кандидаты отвечают одинаково.
4. Никогда не выбирай вопрос по теме, которая есть в AVERSIONS.
5. Никогда не повторяй уже заданный вопрос и не задавай второй подряд вопрос по той же оси.
6. Если среди кандидатов есть специальность с тяжёлым входным барьером — долгое обучение,
   физические требования, служба, риск — спроси про этот барьер раньше тонких различий.

Ты выбираешь ТОЛЬКО из вопросов, переданных в bank — их id. Ты не формулируешь свой вопрос.
Если ответов уже достаточно, чтобы уверенно сузить список до 2–3 специальностей, верни {"done": true}.

Тон вопросов уже задан в их тексте — твоя работа только выбрать id, не переписывать формулировку.

Отвечай ровно одним JSON-объектом:
{"done": false, "bank_question_id": "..."}
{"done": true}
Без markdown и без пояснений.`;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const parsed = stage2QuestionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  const facts = parsed.data;
  if (!isFieldId(facts.field)) return NextResponse.json({ error: "Неизвестное поле" }, { status: 400 });

  const askedIds = new Set<string>(); // `bank` already excludes asked ids — see the hook that builds this request.
  const fallback = templateStage2Question(
    facts.field,
    facts.candidates.map((c) => c.id),
    askedIds,
  );

  if (facts.questions_left <= 0) {
    return NextResponse.json({ done: true, bank_question_id: null, fallback: true } satisfies Stage2QuestionResponse);
  }

  const result = await callModel({
    system: SYSTEM,
    user: JSON.stringify(
      {
        field: facts.field,
        candidates: facts.candidates,
        bank: facts.bank,
        history: facts.history,
        aversions: facts.aversion_labels,
        questions_asked: facts.questions_asked_total,
        questions_left: facts.questions_left,
      },
      null,
      2,
    ),
    schema: stage2ModelOutputSchema,
  });

  if (!result.ok) return NextResponse.json(fallback satisfies Stage2QuestionResponse);

  if (result.value.done) {
    return NextResponse.json({ done: true, bank_question_id: null, fallback: false } satisfies Stage2QuestionResponse);
  }

  const bankIds = new Set(facts.bank.map((q) => q.id));
  // Structural: the model can only ever point at a question it was actually
  // handed. Anything else falls back to the deterministic selector rather
  // than being trusted.
  if (result.value.bank_question_id === undefined || !bankIds.has(result.value.bank_question_id)) {
    return NextResponse.json(fallback satisfies Stage2QuestionResponse);
  }

  const response: Stage2QuestionResponse = {
    done: false,
    bank_question_id: result.value.bank_question_id,
    fallback: false,
  };
  return NextResponse.json(response);
}
