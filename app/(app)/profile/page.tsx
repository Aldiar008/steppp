import type { Metadata } from "next";

import { AccountFamilyScreen } from "@/features/account/account-family-screen";

export const metadata: Metadata = {
  title: "Аккаунт и семья",
  description: "Кто вошёл, и кто ещё видит твой план — родитель может читать, но не может изменить.",
};

export default function Page() {
  return <AccountFamilyScreen />;
}
