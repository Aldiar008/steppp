import { describe, expect, it } from "vitest";

import { rejectInventedNumbers, templateExplanation } from "@/lib/ai/explanation";
import { parseStatementWithRules } from "@/lib/ai/fallback-parser";
import { explanationSchema, parsedProfileSchema } from "@/lib/ai/schema";
import type { ExplainRequest } from "@/lib/ai/schema";

/**
 * The AI boundary is the riskiest surface in this product: a plausible invented
 * deadline would be worse than no answer at all. These tests pin the two
 * guarantees the architecture is supposed to give.
 */

const FACTS: ExplainRequest = {
  doorTitle: "Великобритания · UCAS",
  status: "at_risk",
  pointOfNoReturn: "2026-11-01",
  daysLeft: 46,
  bindingStep: "IELTS 6.5",
  bindingLeadTimeDays: 70,
  fitBand: "moderate",
  fitFactors: [{ label: "Страна из твоего списка", detail: "Ты отметил её в целях" }],
  blockers: [],
};

describe("схема ответа AI", () => {
  it("не содержит ни одного поля под дату, балл или вероятность", () => {
    const keys = Object.keys(parsedProfileSchema.shape);
    expect(keys).not.toContain("deadline");
    expect(keys).not.toContain("pointOfNoReturn");
    expect(keys).not.toContain("chance");
    expect(Object.keys(explanationSchema.shape)).toEqual(["headline", "body"]);
  });

  it("отбрасывает значения вне допустимых диапазонов", () => {
    const bad = parsedProfileSchema.safeParse({
      grade: "15",
      homeCountry: "kz",
      intakeYear: 1900,
      targetCountries: ["Германия"],
      interest: "космос",
      budget: "много",
      nationalScore: -5,
      nationalTaken: null,
      sat: 5000,
      languageTest: "esperanto",
      languageScore: null,
      unclear: [],
    });
    expect(bad.success).toBe(false);
  });
});

describe("защита от выдуманных чисел", () => {
  it("пропускает текст, использующий только переданные числа", () => {
    expect(
      rejectInventedNumbers(
        {
          headline: "Времени ещё есть, но немного.",
          body: "Шаг IELTS 6.5 занимает около 70 дней, поэтому запас в 46 дней уже небольшой.",
        },
        FACTS,
      ),
    ).toBe(true);
  });

  it("отклоняет текст с числом, которого не было во входных данных", () => {
    expect(
      rejectInventedNumbers(
        { headline: "Подай заявку.", body: "Дедлайн 15 января, успей за 30 дней." },
        FACTS,
      ),
    ).toBe(false);
  });

  it("отклоняет выдуманную вероятность поступления", () => {
    expect(
      rejectInventedNumbers(
        { headline: "Хорошие шансы.", body: "Вероятность поступления около 65 процентов." },
        FACTS,
      ),
    ).toBe(false);
  });
});

describe("детерминированное объяснение", () => {
  it("работает без ключа и не выдумывает чисел", () => {
    const result = templateExplanation(FACTS);
    expect(explanationSchema.safeParse(result).success).toBe(true);
    expect(rejectInventedNumbers(result, FACTS)).toBe(true);
  });

  it("объясняет блокировку причиной, а не сроком", () => {
    const result = templateExplanation({
      ...FACTS,
      status: "blocked",
      pointOfNoReturn: null,
      daysLeft: null,
      blockers: ["Этот путь требует денег, которых по твоему ответу нет."],
    });
    expect(result.body).toContain("денег");
  });
});

describe("разбор свободного текста без модели", () => {
  const TEXT =
    "Я в 11 классе в Алматы, люблю программирование, ЕНТ пока не сдавал, " +
    "думаю про Германию или Польшу, семья потянет тысяч десять долларов в год";

  it("вытаскивает страны, класс, направление и бюджет из русского текста", () => {
    const parsed = parseStatementWithRules(TEXT);
    expect(parsed.targetCountries).toEqual(expect.arrayContaining(["DE", "PL"]));
    expect(parsed.grade).toBe("11");
    expect(parsed.interest).toBe("tech");
    expect(parsed.budget).toBe("under_15k");
    expect(parsed.nationalTaken).toBe(false);
  });

  it("не путает родной город с целевой страной", () => {
    const parsed = parseStatementWithRules(TEXT, "KZ");
    expect(parsed.targetCountries).not.toContain("KZ");
    expect(parsed.targetCountries).toEqual(expect.arrayContaining(["DE", "PL"]));
  });

  it("не придумывает то, чего в тексте нет", () => {
    const parsed = parseStatementWithRules(
      "Просто хочу учиться где-нибудь за границей, больше пока ничего не решил.",
    );
    expect(parsed.targetCountries).toEqual([]);
    expect(parsed.budget).toBeNull();
    expect(parsed.grade).toBeNull();
    expect(parsed.unclear.length).toBeGreaterThan(0);
  });

  it("читает баллы IELTS и SAT", () => {
    const parsed = parseStatementWithRules(
      "Сдал IELTS 7.5 и SAT 1420, хочу в США, бюджет до 40000 долларов в год.",
    );
    expect(parsed.languageTest).toBe("ielts");
    expect(parsed.languageScore).toBe(7.5);
    expect(parsed.sat).toBe(1420);
    expect(parsed.targetCountries).toContain("US");
    expect(parsed.budget).toBe("over_30k");
  });

  it("распознаёт бюджет «только стипендия»", () => {
    const parsed = parseStatementWithRules(
      "Платить не сможем совсем, нужен грант или полная стипендия, рассматриваю Турцию.",
    );
    expect(parsed.budget).toBe("scholarship_only");
    expect(parsed.targetCountries).toContain("TR");
  });

  it("выдаёт только значения, которые проходят схему", () => {
    const parsed = parseStatementWithRules(TEXT);
    expect(parsedProfileSchema.safeParse(parsed).success).toBe(true);
  });
});
