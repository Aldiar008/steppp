"use client";

import { useEffect, useRef } from "react";

import { useAuthSession } from "./use-auth-session";
import { bootDemoData } from "@/lib/state/demo-mode";
import { bootRemoteSync, stopRemoteSync } from "@/lib/state/remote-sync";

/**
 * Points `useAppStore` at the signed-in student's own data before any screen
 * under `(app)` reads it. Replaces `ProfileBoot`: there is no longer a locally
 * typed name to pick a box by, the account itself is the box.
 *
 * Renders nothing. Middleware has already refused this route to anyone who
 * isn't a student by the time this mounts, so in practice `status` here is
 * "loading" for one frame and then "student" — the other branches exist for
 * the moment a session expires mid-visit.
 */
export function StudentSessionBoot() {
  const { status, user } = useAuthSession();
  const wasStudent = useRef(false);
  const bootedDemo = useRef(false);

  useEffect(() => {
    if (status === "demo") {
      // Seeded once per app-shell mount, not on every render — a judge
      // navigating between screens keeps their in-session edits; only a
      // fresh mount (a hard reload, or entering demo mode again) resets to
      // Amir's baseline.
      if (!bootedDemo.current) {
        bootedDemo.current = true;
        bootDemoData();
      }
      return;
    }
    bootedDemo.current = false;

    if (status === "student" && user !== null) {
      wasStudent.current = true;
      void bootRemoteSync(user.id);
      return;
    }
    if (wasStudent.current) {
      wasStudent.current = false;
      stopRemoteSync();
    }
  }, [status, user]);

  return null;
}
