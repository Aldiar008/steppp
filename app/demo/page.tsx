import type { Metadata } from "next";

import { DemoPreviewScreen } from "@/features/adaptive/demo-preview-screen";
import "@/styles/app-theme.css";

export const metadata: Metadata = {
  title: "Демо",
  description: "Как выглядит план в Stepwise — на придуманном профиле, без входа.",
};

/**
 * Public, no session, nothing persisted — the one door into the product that
 * stays exactly as accountless as the whole app used to be.
 */
export default function DemoPage() {
  return (
    <div className="stepwise-app">
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <DemoPreviewScreen />
      </main>
    </div>
  );
}
