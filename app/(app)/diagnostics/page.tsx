import type { Metadata } from "next";

import { DiagnosticsScreen } from "@/features/adaptive/diagnostics-screen";

export const metadata: Metadata = {
  title: "Разбор",
  description: "Что мы про тебя знаем, чего не знаем, и что из этого закрывает варианты.",
};

export default function Page() {
  return <DiagnosticsScreen />;
}
