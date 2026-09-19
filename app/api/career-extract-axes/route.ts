import { NextResponse } from "next/server";

import { callModel } from "@/lib/ai/boundary";
import {
  extractAxesModelOutputSchema,
  extractAxesRequestSchema,
  type ExtractAxesResponse,
} from "@/lib/ai/career-contracts";
import { templateExtractAxes } from "@/lib/ai/career-templates";

/**
 * POST /api/career-extract-axes — §5 step 1's free-text extraction.
 *
 * The request carries only the one question's id/text, the student's answer,
 * and the short list of dimensions this question is allowed to touch — never
 * a name, school, age, city, email or phone (§10.7), because the request
 * schema has no such fields to begin with.
 */

const SYSTEM = `Ты извлекаешь из ответа подростка сдвиги по осям психометрической модели, ничего больше.

Тебе дают: текст вопроса, дословный ответ ученика, и список осей/фасетов, которые ЭТОТ вопрос вообще может затронуть — единственные допустимые значения.

Правила:
- Извлеки сдвиги только по перечисленным осям; если ось в ответе не затронута — не возвращай её вообще.
- Не додумывай и не интерпретируй метафоры сверх того, что буквально сказано.
- Каждый сдвиг — число от −50 до 50 и дословная цитата из ответа ученика, на которой основан этот сдвиг.
- Если ответ пустой, уклончивый или не даёт сигнала — верни пустой список сдвигов.
- Никогда не возвращай ось, которой нет в списке допустимых.

Отвечай ровно одним JSON-объектом: {"shifts": [{"dimension": "...", "amount": число, "quote": "..."}]}
Без markdown и без пояснений.`;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const parsed = extractAxesRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  const facts = parsed.data;
  const fallback = templateExtractAxes();

  const result = await callModel({
    system: SYSTEM,
    user: JSON.stringify(
      {
        question: facts.question_text,
        answer: facts.answer_text,
        allowed_dimensions: facts.allowed_dimensions,
      },
      null,
      2,
    ),
    schema: extractAxesModelOutputSchema,
  });

  if (!result.ok) return NextResponse.json(fallback satisfies ExtractAxesResponse);

  const allowed = new Set<string>(facts.allowed_dimensions);
  // Structural, not requested: a dimension outside this question's allowed
  // list is dropped, not trusted — the same "filter, don't ask nicely"
  // pattern as the rest of the AI boundary.
  const shifts = result.value.shifts.filter((shift) => allowed.has(shift.dimension));

  const response: ExtractAxesResponse = { shifts, fallback: false };
  return NextResponse.json(response);
}
