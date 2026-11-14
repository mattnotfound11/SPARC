"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccess, ROLE_LABEL, useStaffSession } from "@/lib/staffAuth";
import { usePublishAvailability } from "@/lib/sparc/useShared";
import { ConsoleShell, ConsoleSkeleton } from "./ConsoleShell";

/**
 * Staff only: signed-out visitors are sent to /admin/login. Administrators see every page; facilitators
 * get live status, entry/exit scanning and the audit log. The data store (SparcProvider) lives in the
 * root layout so the public landing page can show the same live slot count.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  usePublishAvailability();
  const session = useStaffSession();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = session.status === "in" && canAccess(session.role, pathname);

  useEffect(() => {
    if (session.status === "out") router.replace("/admin/login");
    else if (session.status === "in" && !allowed) router.replace("/admin");
  }, [session.status, allowed, router]);

  if (session.status !== "in" || !allowed) {
    return (
      <main className="min-h-svh bg-canvas px-4 pt-8 sm:px-6">
        <ConsoleSkeleton />
      </main>
    );
  }

  return (
    <ConsoleShell adminName={session.name} adminEmail={session.email} role={session.role} roleLabel={ROLE_LABEL[session.role]}>
      {children}
    </ConsoleShell>
  );
}
