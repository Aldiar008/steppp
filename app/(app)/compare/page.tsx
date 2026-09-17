import type { Metadata } from "next";

import { CompareScreen } from "@/features/route/compare-screen";

export const metadata: Metadata = {
  title: "Сравнение",
  description: "Два пути по срокам, деньгам и обязательным шагам.",
};

export default function Page() {
  return <CompareScreen />;
}
