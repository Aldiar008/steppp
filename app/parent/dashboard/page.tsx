import type { Metadata } from "next";

import { ParentDashboardScreen } from "@/features/parent/parent-dashboard-screen";

export const metadata: Metadata = {
  title: "Кабинет родителя",
  description: "План ребёнка: сроки и что уже сделано — только для чтения.",
};

export default function ParentDashboardPage() {
  return <ParentDashboardScreen />;
}
