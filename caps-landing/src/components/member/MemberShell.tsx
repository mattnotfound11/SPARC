"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, History, LayoutGrid, LifeBuoy, LogOut, UserRound } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";
import { ToastProvider } from "@/components/console/ui";
import { signOut, useAdminSession, useMemberSession } from "@/lib/session";
import { MemberData } from "./MemberData";

const NAV = [
  { href: "/member", label: "Live status", short: "Live", icon: LayoutGrid },
  { href: "/member/profile", label: "Profile", short: "Profile", icon: UserRound },
  { href: "/member/history", label: "Parking history", short: "History", icon: History },
  { href: "/member/notifications", label: "Notifications", short: "Alerts", icon: Bell },
] as const;

/** Sits above the sign-out row in the sidebar. */
const SUPPORT = { href: "/member/support", label: "Contact support", short: "Support", icon: LifeBuoy } as const;

const TABS = [...NAV, SUPPORT];

function isActive(pathname: string, href: string) {
  const path = pathname.replace(/\/$/, "");
  return href === "/member" ? path === "/member" : path.startsWith(href);
}

/**
 * Frame for the member dashboard, laid out like the facilitator console: a sidebar on a computer, a top
 * bar and tab bar on a phone. Signed-out visitors go to the login page, staff to the console.
 * What actually keeps one member out of another's data is the database (supabase/lock-down.sql).
 */
export function MemberShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const member = useMemberSession();
  const staff = useAdminSession();
  const staffIn = staff.status === "in" && !staff.open;

  useEffect(() => {
    if (member.status === "in") return;
    if (staffIn) router.replace("/admin");
    else if (member.status === "out" && staff.status !== "loading") router.replace("/login");
  }, [member.status, staff.status, staffIn, router]);

  /** The logo opens the dashboard; if you are already on it, it reloads the live data instead of doing nothing. */
  function goHome(e: React.MouseEvent) {
    if (pathname.replace(/\/$/, "") === "/member") {
      e.preventDefault();
      window.location.reload();
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const email = member.status === "in" ? member.email : "";

  return (
    <ToastProvider>
      <MemberData signedIn={member.status === "in"}>
        <div className="min-h-svh bg-canvas">
          {/* Sidebar — desktop */}
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-canvas px-3 py-4 lg:flex">
            <Link href="/member" onClick={goHome} className="brand-mark flex items-center gap-2.5 rounded-lg px-2 py-1.5" aria-label="SPARC member dashboard">
              <SparcSeal size={36} priority className="size-9" />
              <div className="leading-tight">
                <SparcWordmark className="text-xl text-ink" />
                <p className="text-xs text-ink-muted">Member</p>
              </div>
            </Link>

            <nav aria-label="Member" className="mt-7 flex flex-col gap-1">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className="side-link">
                  <Icon className="size-[1.125rem]" strokeWidth={2} aria-hidden />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto space-y-3">
              <Link href={SUPPORT.href} aria-current={isActive(pathname, SUPPORT.href) ? "page" : undefined} className="side-link">
                <SUPPORT.icon className="size-[1.125rem]" strokeWidth={2} aria-hidden />
                {SUPPORT.label}
              </Link>
              <div className="flex items-center gap-2.5 border-t border-line px-1 pt-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 font-display text-sm font-bold text-gold">
                  {email.charAt(0).toUpperCase()}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">{email}</p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.05] hover:text-ink"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </aside>

          {/* Top bar — phone and tablet */}
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
            <Link href="/member" onClick={goHome} className="brand-mark flex min-h-11 items-center gap-2.5 rounded-lg" aria-label="SPARC member dashboard">
              <SparcSeal size={30} className="size-[1.875rem]" />
              <SparcWordmark className="text-lg text-ink" />
              <span className="text-xs text-ink-muted">Member</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="grid size-11 place-items-center rounded-lg text-ink-muted transition-colors hover:text-ink"
            >
              <LogOut className="size-[1.125rem]" aria-hidden />
            </button>
          </header>

          <main id="main-content" className="px-4 pt-5 pb-28 sm:px-6 lg:pl-[calc(16rem+2rem)] lg:pr-8 lg:pt-8 lg:pb-12">
            <div className="mx-auto max-w-[84rem]">{member.status === "in" ? children : null}</div>
          </main>

          {/* Tab bar — phone and tablet */}
          <nav
            aria-label="Member"
            style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
            className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
          >
            {TABS.map(({ href, short, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                    active ? "text-gold" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={2} aria-hidden />
                  {short}
                </Link>
              );
            })}
          </nav>
        </div>
      </MemberData>
    </ToastProvider>
  );
}
