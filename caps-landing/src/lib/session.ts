"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import * as mock from "@/lib/mockSession";

/*
 * One admin-session API for the whole app. With Supabase configured it is real authentication
 * (and Row Level Security in supabase/schema.sql enforces it on the data). Without it, only in
 * development, it falls back to the mock session so `npm run dev` works with no setup.
 */

export type AdminSession = { status: "loading" } | { status: "out" } | { status: "in"; email: string };

/**
 * Whether /admin asks for a sign-in. Off while the team keeps the database public; turn it on with
 * NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN=true after running supabase/lock-down.sql.
 */
export const loginRequired = process.env.NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN === "true";

/** The mock login is a development convenience, not security, so production builds never use it. */
export const mockAllowed = process.env.NODE_ENV !== "production";

/** The development-only mock login is in use (login required, but no database configured). */
export const usingMockLogin = loginRequired && !isSupabaseConfigured && mockAllowed;

/** Login required but nothing to check it against: the deploy is missing its Supabase settings. */
export const authUnavailable = loginRequired && !isSupabaseConfigured && !mockAllowed;

const WRONG_CREDENTIALS = "That email and password don't match an administrator account.";
const NOT_ADMIN = "This account isn't a SPARC administrator.";
const OFFLINE = "Couldn't reach the sign-in service. Check your connection and try again.";

/** Resolves to an error message, or null on success. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const db = getSupabase();
  if (!db) {
    if (!mockAllowed) return "Sign-in isn't configured for this deployment.";
    return mock.signIn(email, password) ? null : WRONG_CREDENTIALS;
  }
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    // 4xx = the service answered and said no; anything else is a network or server problem.
    const rejected = typeof error.status === "number" && error.status >= 400 && error.status < 500;
    return rejected ? WRONG_CREDENTIALS : OFFLINE;
  }
  // Having an account isn't enough: it must also be listed in the `admins` table.
  const { data: isAdmin, error: checkError } = await db.rpc("is_admin");
  if (checkError || isAdmin !== true) {
    await db.auth.signOut();
    return checkError ? OFFLINE : NOT_ADMIN;
  }
  return null;
}

export async function signOut() {
  const db = getSupabase();
  if (db) await db.auth.signOut();
  else mock.signOut();
}

const OPEN_SESSION: AdminSession = { status: "in", email: mock.DEMO_EMAIL };

export function useAdminSession(): AdminSession {
  const mockSession = mock.useAdminSession();
  const [state, setState] = useState<AdminSession>({ status: "loading" });

  useEffect(() => {
    const db = getSupabase();
    if (!db || !loginRequired) return; // public mode never touches Supabase Auth
    let alive = true;
    const apply = (email: string | undefined) => {
      if (alive) setState(email ? { status: "in", email } : { status: "out" });
    };

    db.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email;
      apply(email);
      // An account removed from `admins` still has a valid session: check in the background and
      // sign it out (SIGNED_OUT below then redirects). The database already hides the data from it,
      // so the console doesn't wait for this. Done here, not inside onAuthStateChange, where
      // Supabase warns against awaiting its own calls.
      if (email)
        db.rpc("is_admin").then(({ data: isAdmin, error }) => {
          if (!error && isAdmin !== true) void db.auth.signOut();
        });
    });

    const { data } = db.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return; // handled (and verified) by getSession above
      apply(session?.user.email);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!loginRequired) return OPEN_SESSION;
  if (isSupabaseConfigured) return state;
  return mockAllowed ? mockSession : { status: "out" };
}
