import type { Metadata } from "next";

import { NextActionScreen } from "@/features/route/next-action-screen";

export const metadata: Metadata = {
  title: "Следующий шаг",
  description: "Одно действие, срок и сколько путей оно удерживает.",
};

export default function Page() {
  return <NextActionScreen />;
}
