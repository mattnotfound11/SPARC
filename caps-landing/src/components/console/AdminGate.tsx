"use client";

import { SparcProvider } from "@/lib/sparc/SparcProvider";
import { DEMO_EMAIL } from "@/lib/mockSession";
import { ConsoleShell } from "./ConsoleShell";

/**
 * The console is open while it runs on demo data: no sign-in. When a real backend arrives,
 * gate it here with `useAdminSession()` from lib/mockSession (or the real provider) and
 * redirect to /admin/login when signed out.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  return (
    <SparcProvider>
      <ConsoleShell adminName="SPARC Administrator" adminEmail={DEMO_EMAIL}>
        {children}
      </ConsoleShell>
    </SparcProvider>
  );
}
