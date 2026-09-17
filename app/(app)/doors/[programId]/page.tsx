import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { APP_CATALOG } from "@/data/catalog";
import { DoorDetailsScreen } from "@/features/route/door-details";

/** Programme ids are stable, so every detail page is pre-rendered. Dates are
 *  computed on the client from the applicant's own profile. */
export function generateStaticParams(): Array<{ programId: string }> {
  return APP_CATALOG.programs.map((program) => ({ programId: program.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ programId: string }>;
}): Promise<Metadata> {
  const { programId } = await params;
  const program = APP_CATALOG.programs.find((item) => item.id === programId);
  return {
    title: program ? `${program.name} — ${program.org}` : "Путь",
    description: program?.notes,
  };
}

export default async function Page({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  // Validated on the server: the client guard renders a skeleton first, so an
  // unknown id would otherwise answer 200.
  if (!APP_CATALOG.programs.some((program) => program.id === programId)) notFound();
  return <DoorDetailsScreen programId={programId} />;
}
