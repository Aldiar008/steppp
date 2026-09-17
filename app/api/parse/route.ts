import { NextResponse } from "next/server";

import { callModel } from "@/lib/ai/boundary";
import {
  parseModelOutputSchema,
  parseRequestSchema,
  type ParseResponse,
} from "@/lib/ai/contracts";
import { parseProfileDeterministically } from "@/lib/ai/deterministic";

/**
 * POST /api/parse — free text in, structured profile fields out.
 *
 * The one place a model touches the applicant's own words, and the only thing
 * it is allowed to do with them is *recognise* facts. It cannot add one. A
 * profile is the input to every deterministic calculation in this product, so a
 * fact invented here would propagate into dates and doors and look computed.
 *
 * The answer is validated against a narrow schema, then handed back with a
 * per-field note of whether the applicant stated it or we read it out of what
 * they wrote. Contradictions in their own text come back as contradictions,
 * never resolved by picking one.
 *
 * With no key, a dead provider or an answer that fails validation twice, the
 * rule-based parser answers instead and the response says so.
 */

const SYSTEM = `Ты извлекаешь факты из текста абитуриента о себе. Ты НЕ советчик и НЕ эксперт по поступлению.

Правила, которые важнее всего остального:
1. Извлекай только то, что человек ПРЯМО написал. Ничего не додумывай.
2. Если факта нет в тексте — не добавляй поле вообще. Пустое поле честнее выдуманного.
3. Не выводи: гражданство из языка, баллы экзаменов, даты, право на поступление, наличие финансирования, доход семьи, вероятность поступления.
4. "Примерно 1,5 млн" — это приблизительная сумма, но записывай её как названную сумму: 1500000 KZT. Не превращай "до 15 000" в точные 15000, если человек назвал потолок, а не сумму.
5. Если человек противоречит сам себе (два возраста, две суммы, две страны в одном предложении как взаимоисключающие) — не выбирай одно. Запиши это в conflicts.
6. confidence: "stated" — человек написал это прямо; "inferred" — ты осторожно вывел из написанного (например "люблю код" → programming); "unknown" — данных нет.

Направления пиши каноническими токенами: programming, computer_science, data_science, ux, design, engineering, medicine, business, economics, mathematics, physics, law.
Страны — двухбуквенными кодами: KZ, PL, DE, HU, TR, US, GB, CZ, KR, CN, AE.
Языки — кодами: ru, kk, en, de, tr, fr, ko, zh. Уровень — только если назван (A1..C2).
Экзамены — id: ent, ielts, toefl, sat. status: planned | registered | taken | completed.

Отвечай ровно одним JSON-объектом вида:
{"profile": {...}, "conflicts": [{"field": "...", "values": ["...", "..."], "explanation": "..."}], "confidence": {"поле": "stated|inferred|unknown"}}
Без markdown, без пояснений вокруг.`;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const parsedRequest = parseRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const { text, locale } = parsedRequest.data;

  // Computed first: it is the answer whenever the model cannot be trusted, and
  // it costs nothing.
  const deterministic = parseProfileDeterministically(text);

  const result = await callModel({
    system: SYSTEM,
    user: `Язык ответа: ${locale}. Текст абитуриента:\n\n${text}`,
    schema: parseModelOutputSchema,
  });

  if (!result.ok) {
    return NextResponse.json(deterministic satisfies ParseResponse);
  }

  const response: ParseResponse = {
    profile: result.value.profile,
    conflicts: result.value.conflicts,
    confidence: result.value.confidence,
    fallback: false,
  };
  return NextResponse.json(response);
}
