"use client";

/**
 * Who is signed in, as state a screen can subscribe to.
 *
 * Deliberately holds no logic of its own — `features/auth/use-auth-session.ts`
 * is the only writer, exactly the split `lib/state/profile-store.ts` used to
 * have with `profile-session.ts` before real accounts existed.
 */
import { create } from "zustand";

export type AuthStatus = "loading" | "signed-out" | "student" | "parent" | "demo";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  onboardingCompleted: boolean;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  setSignedOut: () => void;
  setStudent: (user: AuthUser) => void;
  setParent: (user: AuthUser) => void;
  /** A synthetic, non-Supabase session — see `lib/state/demo-mode.ts`. */
  setDemo: () => void;
}

const DEMO_USER: AuthUser = { id: "demo", email: "", name: "Амир (демо)", onboardingCompleted: true };

export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  user: null,
  setSignedOut: () => set({ status: "signed-out", user: null }),
  setStudent: (user) => set({ status: "student", user }),
  setParent: (user) => set({ status: "parent", user }),
  setDemo: () => set({ status: "demo", user: DEMO_USER }),
}));
