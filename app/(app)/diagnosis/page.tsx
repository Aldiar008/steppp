import { redirect } from "next/navigation";

/** The first-generation breakdown was replaced by /diagnostics. */
export default function Page() {
  redirect("/diagnostics");
}
