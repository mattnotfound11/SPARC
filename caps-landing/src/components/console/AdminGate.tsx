"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authUnavailable, canAccess, ROLE_LABEL, useAdminSession } from "@/lib/session";
import { ConsoleData } from "./ConsoleData";
import { ConsoleShell, ConsoleSkeleton } from "./ConsoleShell";

/**
 * Keeps the console behind a sign-in. This is the user-facing half: it sends signed-out visitors
 * to the login page. The part that actually protects the data is Row Level Security in the
 * database, since a static site's JavaScript can always be bypassed.
 *
 * The console frame renders at once (it is in the prerendered HTML); only its content area waits,
 * showing a skeleton until the session is confirmed and the data has loaded.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useAdminSession();
  const allowed = session.status === "in" && canAccess(session.role, pathname);

  useEffect(() => {
    if (session.status === "out") router.replace("/admin/login");
    else if (session.status === "in" && !allowed) router.replace("/admin");
  }, [session.status, allowed, router]);

  if (authUnavailable) {
    return (
      <main className="grid min-h-svh place-items-center bg-canvas p-6 text-center text-ink-muted">
        The admin console isn&apos;t configured for this deployment (missing Supabase settings).
      </main>
    );
  }

  const signedIn = session.status === "in";
  const role = session.status === "in" ? session.role : "admin";
  return (
    <ConsoleData signedIn={signedIn}>
      <ConsoleShell adminName={`SPARC ${ROLE_LABEL[role]}`} adminEmail={signedIn ? session.email : ""} role={role}>
        {allowed ? children : <ConsoleSkeleton />}
      </ConsoleShell>
    </ConsoleData>
  );
}
