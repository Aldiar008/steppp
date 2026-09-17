import { redirect } from "next/navigation";

/** The interview lives at /start, which is where the landing points. */
export default function Page() {
  redirect("/start");
}
