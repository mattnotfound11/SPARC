"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import * as mock from "@/lib/mockSession";
import type { AccountType } from "@/lib/member/logic";

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
/** Pages only administrators may open; facilitators run the gate and nothing more. */
export const ADMIN_ONLY_PATHS = ["/admin/users", "/admin/reports", "/admin/analytics", "/admin/appeals", "/admin/suggestions"] as const;

export function canAccess(role: StaffRole, pathname: string) {
  return role === "admin" || !ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * Whether /admin asks for a sign-in. On unless you set NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN=false on purpose
 * (an open demo), so signing out always means signing in again. This is the UI gate; what actually
 * protects the data is supabase/lock-down.sql.
 */
export const loginRequired = process.env.NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN !== "false";

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

const NOT_LINKED = "This account isn't linked to a SPARC pass. Ask an administrator to link it.";
const WRONG_LOGIN = "That email and password don't match a SPARC account.";

/** Sign in as staff or as a member. Resolves to what kind of account it is, or an error message. */
export async function signInAccount(email: string, password: string): Promise<{ error: string } | { type: AccountType }> {
  const db = getSupabase();
  if (!db) {
    if (!mockAllowed) return { error: "Sign-in isn't configured for this deployment." };
    const type = mock.signInAny(email, password);
    return type ? { type } : { error: WRONG_LOGIN };
  }
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    const rejected = typeof error.status === "number" && error.status >= 400 && error.status < 500;
    return { error: rejected ? WRONG_LOGIN : OFFLINE };
  }
  const { data, error: checkError } = await db.rpc("account_type");
  if (checkError) {
    await db.auth.signOut();
    return { error: OFFLINE };
  }
  if (data !== "admin" && data !== "facilitator" && data !== "member") {
    await db.auth.signOut();
    return { error: NOT_LINKED };
  }
  return { type: data };
}

export type SignupResult = { error: string } | { ok: true };

/** A plain-language reason for a failed sign-up, with the service's own code in brackets so it can be looked up. */
function signUpFailure(error: { status?: number; code?: string; name?: string; message?: string }): string {
  const code = error.code ?? (error.status ? String(error.status) : (error.name ?? "unknown"));
  const reason = (() => {
    if (error.code === "email_address_invalid") return "That email address was rejected. Use your @usa.edu.ph address.";
    if (error.code === "email_address_not_authorized") return "The mail service isn't set up to send to this address yet. Ask an administrator to connect an email provider.";
    if (error.code === "signup_disabled") return "Sign-ups are turned off for this site. Ask an administrator.";
    if (error.code === "over_email_send_rate_limit" || error.status === 429) return "Too many attempts. Wait a few minutes and try again.";
    if (error.code === "weak_password" || error.status === 422) return "That password was rejected. Use a longer, less common password.";
    if (error.status === 500) return "The server hit an error creating the account. Ask an administrator to check the database logs.";
    if (!error.status) return "Couldn't reach the sign-in service. Check your connection, and turn off any ad blocker or VPN that may block it.";
    return "Couldn't create the account. Try again, or ask an administrator.";
  })();
  return `${reason} [${code}]`;
}

/**
 * Member self sign-up. Creates the login and emails a confirmation link; the database links it to the
 * matching registered record only after the email is confirmed (see claim_member_pass in schema.sql).
 * Always reports the same success whether or not the email or ID exists, so it can't be used to probe.
 */
export async function signUpMember(input: { name: string; email: string; role: string; studentId: string; password: string }): Promise<SignupResult> {
  const db = getSupabase();
  if (!db) return { error: "Sign-up needs the shared database, which isn't connected in this build. In development, use the demo member login instead." };
  const { error } = await db.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: { full_name: input.name.trim().replace(/\s+/g, " "), student_id: input.studentId.trim().toUpperCase().replace(/\s+/g, "-"), campus_role: input.role },
    },
  });
  if (error) return { error: signUpFailure(error) };
  return { ok: true };
}

export type MemberSession = mock.MemberSession;

/** The signed-in Member, if any (a staff account is not a member). */
export function useMemberSession(): MemberSession {
  const mockSession = mock.useMemberSession();
  const [state, setState] = useState<MemberSession>({ status: "loading" });

  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    let alive = true;
    const lookup = (email: string | undefined) => {
      if (!email) return alive && setState({ status: "out" });
      void db.rpc("account_type").then(({ data }) => {
        if (alive) setState(data === "member" ? { status: "in", email } : { status: "out" });
      });
    };
    db.auth.getSession().then(({ data }) => lookup(data.session?.user.email));
    const { data } = db.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      setTimeout(() => lookup(session?.user.email), 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (isSupabaseConfigured) return state;
  return mockAllowed ? mockSession : { status: "out" };
}

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
      void db.rpc("staff_role").then(async ({ data, error }) => {
        if (error) return apply(undefined);
        if (data === "admin" || data === "facilitator") return apply(email, data);
        apply(undefined);
        // A member keeps their session (they just can't use the console); any other account keeps none.
        const kind = await db.rpc("account_type");
        if (kind.data !== "member") void db.auth.signOut();
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
