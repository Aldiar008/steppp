import type { Metadata } from "next";

import { AdaptiveInterviewScreen } from "@/features/adaptive/interview-screen";

export const metadata: Metadata = {
  title: "Расскажи о себе",
  description: "Пять-семь вопросов — только те, что меняют варианты.",
};

/**
 * The personal-profile interview, now strictly post-login: middleware sends
 * every signed-in student here until `onboarding_completed` is set, and
 * nowhere else in the app is reachable before that. The screen itself is
 * untouched — only where it's mounted moved, from `/start` (pre-login) to
 * here (inside the authenticated app shell).
 */
export default function InterviewPage() {
  return <AdaptiveInterviewScreen />;
}
