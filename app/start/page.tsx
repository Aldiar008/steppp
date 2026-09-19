import type { Metadata } from "next";

import { AuthScreen } from "@/features/auth/auth-screen";
import "@/styles/app-theme.css";

export const metadata: Metadata = {
  title: "Вход и регистрация",
  description: "Email и пароль. Личные вопросы начинаются после входа, отдельным шагом.",
};

/**
 * The landing links here, so the URL stays exactly as it was — only what
 * renders behind it changed, from a name-only "profile" picker to real
 * sign-in/sign-up.
 */
export default function StartPage() {
  return (
    <div className="stepwise-app">
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <AuthScreen />
      </main>
    </div>
  );
}
