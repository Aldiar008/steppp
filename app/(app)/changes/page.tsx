import { redirect } from "next/navigation";

/** "What changed" gets its own overlay in the next stage; until then the board
 *  itself is the answer. */
export default function Page() {
  redirect("/doors");
}
