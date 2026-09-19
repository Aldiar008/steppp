/**
 * Амир Ерболұлы, 16 лет, 11 класс, Шымкент — the one demo persona the whole
 * product is walked through on, per "Путь пользователя: Амир из Шымкента".
 *
 * Every field below is a real `Profile` the real engine runs on — nothing
 * downstream (open door count, point-of-no-return dates, leverage panel,
 * roadmap, next action) is hand-typed. If the real catalogue produces
 * different numbers than the source document's illustrative examples, the
 * numbers here are what's true; only the narrative framing around them is
 * Amir's.
 */
import type { Profile } from "@/lib/types";

export const DEMO_PROFILE: Profile = {
  grade: 11,
  interests: ["programming", "computer_science", "data_science"],
  countries: ["KZ", "HU", "US"],
  budget_per_year: { amount: 1_500_000, currency: "KZT" },
  languages: [
    { code: "kk", level: "родной" },
    { code: "en", level: "A2" },
  ],
  exams: [
    { id: "ent", status: "planned" },
    { id: "ielts", status: "planned" },
    { id: "sat", status: "planned" },
  ],
  constraints: { can_relocate: true, needs_full_funding: false },
};
