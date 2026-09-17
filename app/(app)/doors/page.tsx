import type { Metadata } from "next";

import { DoorsScreen } from "@/features/route/doors-screen";

export const metadata: Metadata = {
  title: "Пути",
  description: "Что ещё открыто и когда каждый вариант перестанет быть достижимым.",
};

export default function Page() {
  return <DoorsScreen />;
}
