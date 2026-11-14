"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import * as mock from "@/lib/mockSession";

/*
 * One admin-session API for the whole app. With Supabase configured it is real authentication
 * (and Row Level Security in supabase/schema.sql enforces it on the data). Without it, only in
 * development, it falls back to the mock session so `npm run dev` works with no setup.
 */

export type StaffRole = mock.StaffRole;
export const ROLE_LABEL: Record<StaffRole, string> = { admin: "Administrator", facilitator: "Facilitator" };

/** `open` marks the anonymous administrator view of public mode (nobody actually signed in). */
export type AdminSession = { status: "loading" } | { status: "out" } | { status: "in"; email: string; role: StaffRole; open?: boolean };

/** Facilitators run the gate (live status, scanning, audit log); Users and Reports are for administrators. */
export function canAccess(role: StaffRole, pathname: string) {
  return role === "admin" || !(pathname.startsWith("/admin/users") || pathname.startsWith("/admin/reports"));
}

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
const NOT_STAFF = "This account has no SPARC staff access. Ask an administrator to add it.";
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
  // Having an account isn't enough: it must also be listed in `admins` or `facilitators`.
  const { data: role, error: checkError } = await db.rpc("staff_role");
  if (checkError || (role !== "admin" && role !== "facilitator")) {
    await db.auth.signOut();
    return checkError ? OFFLINE : NOT_STAFF;
  }
  return null;
}

export async function signOut() {
  const db = getSupabase();
  if (db) await db.auth.signOut();
  else mock.signOut();
}

const OPEN_SESSION: AdminSession = { status: "in", email: mock.DEMO_EMAIL, role: "admin", open: true };

export function useAdminSession(): AdminSession {
  const mockSession = mock.useAdminSession();
  const [state, setState] = useState<AdminSession>({ status: "loading" });

  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    let alive = true;
    const apply = (email: string | undefined, role?: StaffRole) => {
      if (alive) setState(email && role ? { status: "in", email, role } : { status: "out" });
    };
    const lookup = (email: string | undefined) => {
      if (!email) return apply(undefined);
      void db.rpc("staff_role").then(({ data, error }) => {
        if (error) return apply(undefined);
        if (data === "admin" || data === "facilitator") apply(email, data);
        else {
          apply(undefined);
          void db.auth.signOut(); // an account with no staff role keeps no session
        }
      });
    };

    db.auth.getSession().then(({ data }) => lookup(data.session?.user.email));

    const { data } = db.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return; // handled above
      // Deferred: Supabase warns against awaiting its own calls inside this callback.
      setTimeout(() => lookup(session?.user.email), 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Public mode keeps the console open, but a staff member who really signed in keeps their role
  // (a facilitator stays limited to the gate pages).
  if (!loginRequired) {
    const real = isSupabaseConfigured ? state : mockAllowed ? mockSession : null;
    return real?.status === "in" ? real : OPEN_SESSION;
  }
  if (isSupabaseConfigured) return state;
  return mockAllowed ? mockSession : { status: "out" };
}
