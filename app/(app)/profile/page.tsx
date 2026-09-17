import type { Metadata } from "next";

import { AccountScreen } from "@/features/account/account-screen";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Кто сейчас в приложении. Профили хранятся только в этом браузере.",
};

export default function Page() {
  return <AccountScreen />;
}
