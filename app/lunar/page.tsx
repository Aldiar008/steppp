import type { Metadata } from "next";

import { LunarDemo } from "@/features/lunar/lunar-demo";

export const metadata: Metadata = {
  title: "Lunar Gravity",
  description: "Демонстрация интерактивной 3D-карточки на three.js.",
};

export default function LunarPage() {
  return (
    <main id="main" className="flex-1">
      <LunarDemo />
    </main>
  );
}
