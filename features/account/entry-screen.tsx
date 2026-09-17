"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AdaptiveInterviewScreen } from "@/features/adaptive/interview-screen";
import { SignInScreen } from "./sign-in-screen";
import { useProfileSession } from "./use-profile-session";

/**
 * The front door.
 *
 * One URL, two screens: pick a profile, then answer questions. Keeping them
 * behind the same address matters because the landing links here and the
 * landing is frozen — and because "начать" and "вернуться" are the same button
 * to the person pressing it. Which one they get depends on whether this browser
 * already knows them.
 */
export function EntryScreen() {
  const { ready, slot } = useProfileSession();
  // Signing in inside this component should move straight on to the questions,
  // without a navigation and without waiting for a round trip.
  const [signedInHere, setSignedInHere] = useState(false);

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 py-10" aria-busy="true" aria-live="polite">
        <span className="sr-only">Открываем профиль</span>
        <Skeleton className="mx-auto h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (slot === undefined && !signedInHere) {
    return <SignInScreen onDone={() => setSignedInHere(true)} />;
  }

  return <AdaptiveInterviewScreen />;
}
