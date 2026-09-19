import type { Metadata } from "next";
import { Suspense } from "react";

import { JoinScreen } from "@/features/parent/join-screen";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Приглашение от ребёнка",
  description: "Заведи свой отдельный вход и получи доступ на чтение к плану ребёнка.",
};

/**
 * Decoding happens on the server, before any form renders — the same reason
 * the old `/parent/[state]` decoded its link server-side: a broken or spent
 * code should never ship a signup form that cannot possibly succeed.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invite_info", { p_code: code });
  const info = data?.[0] ?? { valid: false, reason: "not_found", student_name: null };

  return (
    <Suspense>
      <JoinScreen code={code} info={info} />
    </Suspense>
  );
}
