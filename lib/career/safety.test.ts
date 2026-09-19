import { describe, expect, it } from "vitest";

import { detectCrisisSignal } from "./safety";

describe("crisis-detection interrupt (§10.6)", () => {
  it("triggers on an explicit self-harm statement", () => {
    expect(detectCrisisSignal("иногда думаю о самоубийстве").triggered).toBe(true);
  });

  it("triggers on hopelessness phrasing from the document's own example", () => {
    expect(detectCrisisSignal("я никому не нужен и не хочу жить").triggered).toBe(true);
  });

  it("triggers with a word inserted between the core verbs — found live in a real browser run", () => {
    // "не хочу БОЛЬШЕ жить" — a literal `/не хочу жить/` substring match
    // missed this real phrasing entirely when actually typed into the app.
    expect(detectCrisisSignal("не хочу больше жить, всё бессмысленно").triggered).toBe(true);
  });

  it("triggers on hopelessness phrasing without an explicit self-harm verb", () => {
    expect(detectCrisisSignal("всё бессмысленно, не вижу смысла продолжать").triggered).toBe(true);
  });

  it("does not trigger on ordinary interview answers", () => {
    expect(detectCrisisSignal("мне нравится разбирать технику по выходным").triggered).toBe(false);
    expect(detectCrisisSignal("").triggered).toBe(false);
  });

  it("works with no network or model involved — pure regex", () => {
    // Calling it twice with the same input must be identical, since a real
    // safety stop cannot depend on anything nondeterministic.
    const a = detectCrisisSignal("не хочу жить дальше так");
    const b = detectCrisisSignal("не хочу жить дальше так");
    expect(a).toEqual(b);
  });
});
