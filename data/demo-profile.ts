/**
 * One deterministic profile, for development and for showing the product.
 *
 * It is not a real person and nothing in the UI pretends otherwise: the button
 * that loads it says "демо-профиль" out loud. It exists so the whole path —
 * board, details, comparison, plan, next step — can be walked in seconds
 * without answering questions first.
 */
import type { Profile } from "@/lib/types";

export const DEMO_PROFILE: Profile = {
  grade: 11,
  interests: ["программирование", "дизайн интерфейсов"],
  countries: ["KZ", "PL"],
  budget_per_year: { amount: 1_500_000, currency: "KZT" },
  languages: [
    { code: "ru", level: "C1" },
    { code: "en", level: "B2" },
  ],
  exams: [{ id: "ent", score: 112, status: "planned" }],
  constraints: { can_relocate: true, needs_full_funding: false },
};
