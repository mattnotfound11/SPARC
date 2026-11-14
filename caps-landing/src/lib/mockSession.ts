"use client";

import { useSyncExternalStore } from "react";

/*
 * MOCK ADMIN SESSION, for development only. lib/session.ts uses it when no Supabase project is
 * configured, so `npm run dev` works with no setup; production builds never use it. It is NOT
 * security: it lives in the browser's sessionStorage and guards local demo data only.
 */

export const DEMO_EMAIL = "admin@usa.edu.ph";
/** Empty in production builds, so the string never ships; the mock login only runs in development. */
export const DEMO_PASSWORD = process.env.NODE_ENV === "production" ? "" : "sparc-demo";

const KEY = "sparc_admin_session";
const EVENT = "sparc-session-change";
const TTL_MS = 8 * 60 * 60 * 1000;

type Stored = { email: string; exp: number };

export function signIn(email: string, password: string): boolean {
  if (!DEMO_PASSWORD) return false;
  if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) return false;
  try {
    const value: Stored = { email: DEMO_EMAIL, exp: Date.now() + TTL_MS };
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    return false; // storage blocked: can't hold a session
  }
  window.dispatchEvent(new Event(EVENT));
  return true;
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

export type AdminSession = { status: "loading" } | { status: "out" } | { status: "in"; email: string };

export function useAdminSession(): AdminSession {
  // null on the server and during hydration → "loading", so markup always matches
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  if (raw === null) return { status: "loading" };
  if (!raw) return { status: "out" };
  try {
    return { status: "in", email: (JSON.parse(raw) as Stored).email };
  } catch {
    return { status: "out" };
  }
}
