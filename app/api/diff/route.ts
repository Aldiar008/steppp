import { NextResponse } from "next/server";

import { callModel } from "@/lib/ai/boundary";
import {
  diffModelOutputSchema,
  diffRequestSchema,
  type DiffResponse,
} from "@/lib/ai/contracts";
import { templateDiff } from "@/lib/ai/deterministic";
import { isGrounded } from "@/lib/ai/grounding";

/**
 * POST /api/diff — an already-computed difference, put into words.
 *
 * The deterministic diff engine decided what opened, what closed, which date
 * moved and whether the next step changed. That result is the input here. The
 * model is never handed two boards, because then it could compare them and its
 * comparison would compete with the engine's.
 *
 * It may name a cause only when the supplied facts contain it. The same
 * grounding check as /api/explain applies to every number in the answer, and a
 * failure returns the deterministic wording instead.
 */

const SYSTEM = `Ты объясняешь абитуриенту, что изменилось в его маршруте после правки профиля.

Тебе дают УЖЕ ПОСЧИТАННУЮ разницу. Ты ничего не считаешь.

Запрещено:
- называть числа и даты, которых нет во входных данных;
- пересчитывать количество путей, дни или сроки;
- придумывать причину, которой нет в данных;
- говорить о шансах и вероятности поступления;
- пугать и давить срочностью.

Разрешено: связать изменение поля профиля с тем, что движок уже посчитал — например, что после изменения бюджета один путь стал доступен, а другой перестал укладываться в ограничения.

Тон: спокойный, прямой, для 16-летнего человека. Русский язык.
headline — одно предложение. reasons — до трёх коротких пунктов.

Отвечай ровно одним JSON-объектом: {"headline": "...", "reasons": ["..."]} — без markdown.`;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const parsedRequest = diffRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const facts = parsedRequest.data;
  const fallback = templateDiff(facts);

  const result = await callModel({
    system: SYSTEM,
    user:
      `Тон: ${facts.tone}. Изменено поле «${facts.changed_field}»` +
      (facts.old_value !== undefined && facts.new_value !== undefined
        ? `: ${facts.old_value} → ${facts.new_value}.`
        : ".") +
      `\n\nПосчитанная разница (использовать только её):\n${JSON.stringify(facts.diff, null, 2)}`,
    schema: diffModelOutputSchema,
  });

  if (!result.ok) return NextResponse.json(fallback satisfies DiffResponse);

  const generated = `${result.value.headline} ${result.value.reasons.join(" ")}`;
  if (!isGrounded(generated, facts)) {
    return NextResponse.json(fallback satisfies DiffResponse);
  }

  const response: DiffResponse = {
    headline: result.value.headline,
    reasons: result.value.reasons,
    grounded: true,
    fallback: false,
  };
  return NextResponse.json(response);
}
