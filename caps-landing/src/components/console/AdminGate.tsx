"use client";

import { DEMO_EMAIL } from "@/lib/mockSession";
import { usePublishAvailability } from "@/lib/sparc/useShared";
import { ConsoleShell } from "./ConsoleShell";

/**
 * The console is open while it runs on demo data: no sign-in. The data store (SparcProvider) lives in
 * the root layout so the public landing page can show the same live slot count. When a real backend arrives,
 * gate it here with `useAdminSession()` from lib/mockSession (or the real provider) and
 * redirect to /admin/login when signed out.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  usePublishAvailability();
  return (
    <ConsoleShell adminName="SPARC Administrator" adminEmail={DEMO_EMAIL}>
      {children}
    </ConsoleShell>
  );
}
