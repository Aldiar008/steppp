import type { Metadata } from "next";

import { RoadmapScreen } from "@/features/route/roadmap-screen";

export const metadata: Metadata = {
  title: "План",
  description: "Обязательные шаги по месяцам — когда каждый ещё можно начать.",
};

export default function Page() {
  return <RoadmapScreen />;
}
