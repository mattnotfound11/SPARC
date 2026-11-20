"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";
import { ToastProvider } from "@/components/console/ui";
import { signOut, useAdminSession, useMemberSession } from "@/lib/session";

/**
 * Frame for the member dashboard. Signed-out visitors go to the login page, staff to the console.
 * What actually keeps one member out of another's data is the database (supabase/lock-down.sql).
 */
export function MemberShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const member = useMemberSession();
  const staff = useAdminSession();
  const staffIn = staff.status === "in" && !staff.open;

  useEffect(() => {
    if (member.status === "in") return;
    if (staffIn) router.replace("/admin");
    else if (member.status === "out" && staff.status !== "loading") router.replace("/login");
  }, [member.status, staff.status, staffIn, router]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <ToastProvider>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <nav aria-label="Member" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="brand-mark flex items-center gap-2.5 rounded-lg" aria-label="SPARC home">
            <SparcSeal size={32} priority className="size-8" />
            <SparcWordmark className="hidden text-lg text-ink min-[480px]:inline" />
          </Link>
          {member.status === "in" && (
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate text-sm text-ink-muted">{member.email}</span>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.05] hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </nav>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        {member.status === "in" ? children : null}
      </main>
    </ToastProvider>
  );
}
