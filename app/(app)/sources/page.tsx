import type { Metadata } from "next";

import { SourcesScreen } from "@/features/route/sources-screen";

export const metadata: Metadata = {
  title: "Источники и методика",
  description: "Откуда данные, как считается точка невозврата и что означают уровни доверия.",
};

export default function Page() {
  return <SourcesScreen />;
}
