import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { describeAuthError } from "./auth-errors";

describe("describeAuthError", () => {
  it("explains a wrong password without saying which field was wrong", () => {
    const error = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    expect(describeAuthError(error)).toBe("Неверный email или пароль.");
  });

  it("flags an email already used by another account, across roles", () => {
    const error = new AuthApiError("User already registered", 422, "user_already_exists");
    expect(describeAuthError(error)).toContain("уже используется");
  });

  it("tells the applicant to check their inbox when the email isn't confirmed", () => {
    const error = new AuthApiError("Email not confirmed", 400, "email_not_confirmed");
    expect(describeAuthError(error)).toContain("подтверждён");
  });

  it("explains a weak password with the actual rule", () => {
    const error = new AuthApiError("Password too short", 422, "weak_password");
    expect(describeAuthError(error)).toContain("6 символов");
  });

  it("falls back to the server message for an unmapped code", () => {
    const error = new AuthApiError("Something specific", 400, "some_future_code");
    expect(describeAuthError(error)).toBe("Something specific");
  });

  it("reports a network failure distinctly from a credentials failure", () => {
    const error = new AuthRetryableFetchError("fetch failed", 0);
    expect(describeAuthError(error)).toContain("связаться с сервером");
  });

  it("never throws on a value that isn't an Error at all", () => {
    expect(() => describeAuthError("not an error")).not.toThrow();
    expect(() => describeAuthError(undefined)).not.toThrow();
    expect(describeAuthError(null)).toBe("Что-то пошло не так. Попробуй ещё раз.");
  });
});
