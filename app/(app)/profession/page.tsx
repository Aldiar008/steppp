import type { Metadata } from "next";

import { ProfessionScreen } from "@/features/profession/profession-screen";

export const metadata: Metadata = {
  title: "Найти профессию",
  description: "Короткое интервью: сначала общие вопросы, потом уточняющие — до узкой специальности.",
};

export default function Page() {
  return <ProfessionScreen />;
}
