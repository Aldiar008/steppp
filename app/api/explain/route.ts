import { NextResponse } from "next/server";

import { callModel } from "@/lib/ai/boundary";
import {
  explainModelOutputSchema,
  explainRequestSchema,
  type ExplainResponse,
} from "@/lib/ai/contracts";
import { templateExplain } from "@/lib/ai/deterministic";
import { isGrounded } from "@/lib/ai/grounding";

/**
 * POST /api/explain — computed facts in, two or three sentences out.
 *
 * The model receives the engine's answer, never its inputs: a status, a date, a
 * countdown, the binding step, what matched and what blocks. It cannot compute
 * any of those and is not asked to. It cannot see the catalogue, so it cannot
 * quote a price or a deadline that was not handed to it.
 *
 * Whatever comes back is checked digit by digit against those facts. A number
 * or date that was not in the input means the answer is discarded and the
 * deterministic template is returned instead — `grounded` says which happened,
 * and it is computed, not claimed.
 */

const SYSTEM = `Ты объясняешь абитуриенту уже посчитанный результат. Ты НЕ считаешь ничего сам.

Запрещено:
- называть любые числа и даты, которых нет во входных фактах;
- вычислять дни, сроки, баллы, стоимость, проценты;
- говорить о вероятности или шансах поступления;
- обещать поступление, пугать, стыдить, давить срочностью;
- советовать вуз или сравнивать вузы между собой.

Разрешено: объяснить простыми словами, что означают уже данные тебе факты — почему путь закрывается, какой шаг всё держит, что значит точка невозврата, на что стоит смотреть.

Тон: спокойный, прямой, для 16-летнего человека. Без канцелярита и без маркетинга.
Два-три предложения. Русский язык.

Отвечай ровно одним JSON-объектом: {"text": "..."} — без markdown и без пояснений.`;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const parsedRequest = explainRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const facts = parsedRequest.data;
  const fallback = templateExplain(facts);

  const result = await callModel({
    system: SYSTEM,
    user:
      `Тон: ${facts.tone}. Факты, посчитанные движком (использовать только их):\n\n` +
      JSON.stringify({ door: facts.door, profile_summary: facts.profile_summary }, null, 2),
    schema: explainModelOutputSchema,
  });

  if (!result.ok) return NextResponse.json(fallback satisfies ExplainResponse);

  // The guard, not the prompt, is what makes this safe.
  if (!isGrounded(result.value.text, facts)) {
    return NextResponse.json(fallback satisfies ExplainResponse);
  }

  const response: ExplainResponse = { text: result.value.text, grounded: true, fallback: false };
  return NextResponse.json(response);
}
