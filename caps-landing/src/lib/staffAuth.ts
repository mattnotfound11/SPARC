"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { signIn as mockSignIn, signOut as mockSignOut, useAdminSession } from "./mockSession";
import { sharedClient } from "./sparc/shared";

/*
 * Staff authentication (administrators and facilitators).
 * With Supabase configured, this is real Supabase Auth (email + password) and the role comes from the
 * `sparc_profiles` table (see supabase/schema.sql); an account with no profile row has no staff access.
 * Without Supabase it falls back to the browser-only demo admin in mockSession, which is NOT security.
 */

export type StaffRole = "admin" | "facilitator";
export type StaffSession =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; email: string; name: string; role: StaffRole };

export const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

export const ROLE_LABEL: Record<StaffRole, string> = { admin: "Administrator", facilitator: "Facilitator" };

/** Pages a facilitator may not open (they run the gate: live status, scanning and the audit log). */
export function canAccess(role: StaffRole, pathname: string) {
  if (role === "admin") return true;
  return !(pathname.startsWith("/admin/users") || pathname.startsWith("/admin/reports"));
}

async function loadProfile(session: Session | null): Promise<StaffSession> {
  if (!session) return { status: "out" };
  const client = await sharedClient();
  if (!client) return { status: "out" };
  const { data } = await client.from("sparc_profiles").select("role, full_name").eq("id", session.user.id).maybeSingle();
  const role = data?.role;
  if (role !== "admin" && role !== "facilitator") return { status: "out" };
  const email = session.user.email ?? "";
  return { status: "in", email, name: data?.full_name || email.split("@")[0] || ROLE_LABEL[role as StaffRole], role };
}

const BAD_LOGIN = "That email and password don't match a staff account.";

export async function signInStaff(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await sharedClient();
  if (!client) return mockSignIn(email, password) ? { ok: true } : { ok: false, error: BAD_LOGIN };
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.session) return { ok: false, error: BAD_LOGIN };
  const profile = await loadProfile(data.session);
  if (profile.status !== "in") {
    await client.auth.signOut();
    return { ok: false, error: "This account has no staff access. Ask an administrator to assign you a role." };
  }
  return { ok: true };
}

export async function signOutStaff() {
  mockSignOut();
  const client = await sharedClient();
  if (client) await client.auth.signOut();
}

export function useStaffSession(): StaffSession {
  const mock = useAdminSession();
  const [remote, setRemote] = useState<StaffSession>({ status: "loading" });

  useEffect(() => {
    if (!authConfigured) return;
    let stopped = false;
    let unsubscribe = () => {};
    const apply = (session: Session | null) =>
      void loadProfile(session).then((s) => {
        if (!stopped) setRemote(s);
      });
    void sharedClient().then((client) => {
      if (!client || stopped) return;
      void client.auth.getSession().then(({ data }) => apply(data.session));
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        // Defer: calling Supabase from inside this callback can deadlock the auth lock.
        setTimeout(() => apply(session), 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, []);

  if (authConfigured) return remote;
  if (mock.status === "in") return { status: "in", email: mock.email, name: mock.name, role: mock.role };
  return mock;
}
