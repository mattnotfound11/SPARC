"use client";

import { useSyncExternalStore } from "react";

/*
 * MOCK ADMIN SESSION. The site ships as a static export (no server), so this lives in
 * the browser. It is a stand-in for the real account service, NOT security: the demo
 * credentials are in the client bundle, and the console only shows synthetic data.
 * Replace this file with the real provider (and move any real data behind it) before
 * the console shows real gate or user information.
 */

export const DEMO_EMAIL = "admin@usa.edu.ph";
export const DEMO_PASSWORD = "sparc-demo";

const KEY = "sparc_admin_session";
const EVENT = "sparc-session-change";
const TTL_MS = 8 * 60 * 60 * 1000;

type Stored = { email: string; exp: number };

export function signIn(email: string, password: string): boolean {
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
