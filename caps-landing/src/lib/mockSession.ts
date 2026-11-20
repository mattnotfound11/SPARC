"use client";

import { useSyncExternalStore } from "react";

/*
 * MOCK ADMIN SESSION, for development only. lib/session.ts uses it when no Supabase project is
 * configured, so `npm run dev` works with no setup; production builds never use it. It is NOT
 * security: it lives in the browser's sessionStorage and guards local demo data only.
 */

export const DEMO_ACCOUNTS = [
  { email: "admin@usa.edu.ph", role: "admin", name: "SPARC Administrator" },
  { email: "facilitator@usa.edu.ph", role: "facilitator", name: "SPARC Facilitator" },
] as const;
export const DEMO_EMAIL = DEMO_ACCOUNTS[0].email;
/** A demo Member (a registered student with a pass). Not a staff role: it never opens the console. */
export const DEMO_MEMBER = { email: "member@usa.edu.ph", name: "Demo Member" } as const;
/** Whether a stored role is one of the staff roles (a stored "member" must never open the console). */
export const isStaffRole = (role: unknown): role is StaffRole => role === "admin" || role === "facilitator";
export type StaffRole = (typeof DEMO_ACCOUNTS)[number]["role"];
/** Empty in production builds, so the string never ships; the mock login only runs in development. */
export const DEMO_PASSWORD = process.env.NODE_ENV === "production" ? "" : "sparc-demo";

const KEY = "sparc_admin_session";
const EVENT = "sparc-session-change";
const TTL_MS = 8 * 60 * 60 * 1000;

type Stored = { email: string; role: StaffRole | "member"; name: string; exp: number };

/** The account type that signed in ("admin" | "facilitator" | "member"), or null when the login is wrong. */
export function signInAny(email: string, password: string): StaffRole | "member" | null {
  if (!DEMO_PASSWORD || password !== DEMO_PASSWORD) return null;
  const typed = email.trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find((a) => a.email === typed) ?? (typed === DEMO_MEMBER.email ? { ...DEMO_MEMBER, role: "member" as const } : null);
  if (!account) return null;
  try {
    const value: Stored = { ...account, exp: Date.now() + TTL_MS };
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    return null; // storage blocked: can't hold a session
  }
  window.dispatchEvent(new Event(EVENT));
  return account.role;
}

/** Staff-only sign in (the /admin/login page): a member login is refused here. */
export function signIn(email: string, password: string): boolean {
  const typed = email.trim().toLowerCase();
  if (typed === DEMO_MEMBER.email) return false;
  return signInAny(email, password) !== null;
}

export function signOut() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// A primitive snapshot, so React sees "no change" until the stored value really changes.
// An expired session reads as signed out.
const snapshot = () => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return "";
    return (JSON.parse(raw) as Stored).exp > Date.now() ? raw : "";
  } catch {
    return "";
  }
};

export type AdminSession = { status: "loading" } | { status: "out" } | { status: "in"; email: string; role: StaffRole };

export function useAdminSession(): AdminSession {
  // null on the server and during hydration → "loading", so markup always matches
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  if (raw === null) return { status: "loading" };
  if (!raw) return { status: "out" };
  try {
    const { email, role } = JSON.parse(raw) as Stored;
    if (!isStaffRole(role)) return { status: "out" }; // saved by an older build, or a member
    return { status: "in", email, role };
  } catch {
    return { status: "out" };
  }
}

export type MemberSession = { status: "loading" } | { status: "out" } | { status: "in"; email: string };

export function useMemberSession(): MemberSession {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  if (raw === null) return { status: "loading" };
  if (!raw) return { status: "out" };
  try {
    const { email, role } = JSON.parse(raw) as Stored;
    return role === "member" ? { status: "in", email } : { status: "out" };
  } catch {
    return { status: "out" };
  }
}
