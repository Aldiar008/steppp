import type { Metadata } from "next";

import { EntryScreen } from "@/features/account/entry-screen";
import "@/styles/app-theme.css";

export const metadata: Metadata = {
  title: "Вход и короткое интервью",
  description: "Профиль хранится в браузере. Пять-семь вопросов — только те, что меняют варианты.",
};

/**
 * The landing links here, so the URL stays exactly as it was. Behind it: pick
 * whose answers to open, then the adaptive interview.
 */
export default function StartPage() {
  return (
    <div className="stepwise-app">
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <EntryScreen />
      </main>
    </div>
  );
}
