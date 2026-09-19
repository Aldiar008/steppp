import { describe, expect, it } from "vitest";

import { decideRedirect, type SessionInfo } from "./route-guard";

const SIGNED_OUT: SessionInfo = { kind: "signed-out" };
const ONBOARDED_STUDENT: SessionInfo = { kind: "student", onboardingCompleted: true };
const NEW_STUDENT: SessionInfo = { kind: "student", onboardingCompleted: false };
const PARENT: SessionInfo = { kind: "parent" };
const DEMO: SessionInfo = { kind: "demo" };

describe("decideRedirect", () => {
  it("lets the landing and other public paths through for anyone", () => {
    for (const session of [SIGNED_OUT, ONBOARDED_STUDENT, NEW_STUDENT, PARENT, DEMO]) {
      expect(decideRedirect(session, "/")).toBeNull();
      expect(decideRedirect(session, "/start")).toBeNull();
      expect(decideRedirect(session, "/demo")).toBeNull();
      expect(decideRedirect(session, "/parent/join/ABCD1234")).toBeNull();
    }
  });

  it("sends a signed-out visitor to /start from any student page", () => {
    expect(decideRedirect(SIGNED_OUT, "/doors")).toBe("/start");
    expect(decideRedirect(SIGNED_OUT, "/doors/some-program")).toBe("/start");
    expect(decideRedirect(SIGNED_OUT, "/interview")).toBe("/start");
  });

  it("sends a signed-out visitor to /start from the parent dashboard", () => {
    expect(decideRedirect(SIGNED_OUT, "/parent/dashboard")).toBe("/start");
  });

  it("lets an onboarded student through to any student page", () => {
    expect(decideRedirect(ONBOARDED_STUDENT, "/doors")).toBeNull();
    expect(decideRedirect(ONBOARDED_STUDENT, "/roadmap")).toBeNull();
    expect(decideRedirect(ONBOARDED_STUDENT, "/interview")).toBeNull();
  });

  it("returns a student who hasn't finished onboarding to /interview from anywhere else", () => {
    expect(decideRedirect(NEW_STUDENT, "/doors")).toBe("/interview");
    expect(decideRedirect(NEW_STUDENT, "/profile")).toBe("/interview");
  });

  it("never redirects a student already on /interview", () => {
    expect(decideRedirect(NEW_STUDENT, "/interview")).toBeNull();
  });

  it("bounces a parent away from every student page to their own dashboard", () => {
    expect(decideRedirect(PARENT, "/doors")).toBe("/parent/dashboard");
    expect(decideRedirect(PARENT, "/profile")).toBe("/parent/dashboard");
  });

  it("bounces a student away from the parent dashboard, to wherever they belong", () => {
    expect(decideRedirect(ONBOARDED_STUDENT, "/parent/dashboard")).toBe("/doors");
    expect(decideRedirect(NEW_STUDENT, "/parent/dashboard")).toBe("/interview");
  });

  it("lets a parent stay on their own dashboard", () => {
    expect(decideRedirect(PARENT, "/parent/dashboard")).toBeNull();
    expect(decideRedirect(PARENT, "/parent/dashboard/settings")).toBeNull();
  });

  it("lets a demo visitor straight into every student page, never the interview", () => {
    expect(decideRedirect(DEMO, "/doors")).toBeNull();
    expect(decideRedirect(DEMO, "/roadmap")).toBeNull();
    expect(decideRedirect(DEMO, "/interview")).toBeNull();
  });

  it("bounces a demo visitor away from the parent dashboard, to their own doors", () => {
    expect(decideRedirect(DEMO, "/parent/dashboard")).toBe("/doors");
  });
});
