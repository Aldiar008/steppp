import { describe, expect, it } from "vitest";

import { initialsOf } from "@/components/avatar";

describe("initialsOf", () => {
  it("no longer collides every 'University of X' on the same two letters", () => {
    // The bug this locks in: skipping only whitespace, not stop words, gave
    // Cambridge, Oxford and Berkeley the identical "UO" square on /doors —
    // "University" + "of" is the second-most-common opening in the catalogue.
    expect(initialsOf("University of Cambridge")).toBe("UC");
    expect(initialsOf("University of Oxford")).toBe("UO");
    expect(initialsOf("University of California, Berkeley")).toBe("UC");
  });

  it("skips a leading stop word in other languages the catalogue actually has", () => {
    expect(initialsOf("Technical University of Munich")).toBe("TU");
    expect(initialsOf("London School of Economics")).toBe("LS");
  });

  it("still reads a plain two-word name the same as before", () => {
    expect(initialsOf("Тест Тестов")).toBe("ТТ");
    expect(initialsOf("Nazarbayev University")).toBe("NU");
  });

  it("falls back to the email's first letter with no name", () => {
    expect(initialsOf(undefined, "amir@example.com")).toBe("A");
  });

  it("never returns empty", () => {
    expect(initialsOf(undefined, undefined)).toBe("?");
    expect(initialsOf("   ", "")).toBe("?");
  });
});
