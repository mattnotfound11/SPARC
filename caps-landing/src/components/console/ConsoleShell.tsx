"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChartColumn, ExternalLink, Layers, LayoutGrid, LogOut, Pause, Play, ScrollText, Users } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";
import { SparcGate, useSparcStoreOrNull } from "@/lib/sparc/SparcProvider";
import { ToastProvider } from "./ui";

const NAV = [
  { href: "/admin", label: "Live status", short: "Live", icon: LayoutGrid },
  { href: "/admin/slots", label: "Slots & floors", short: "Floors", icon: Layers },
  { href: "/admin/users", label: "Users", short: "Users", icon: Users },
  { href: "/admin/logs", label: "Entry & exit log", short: "Log", icon: ScrollText },
  { href: "/admin/reports", label: "Reports", short: "Reports", icon: ChartColumn },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function FeedControl({ compact = false }: { compact?: boolean }) {
  const store = useSparcStoreOrNull();
  const live = useSyncExternalStore(
    store ? store.subscribe : () => () => {},
    () => store?.getState().live ?? false,
    () => false,
  );

  if (!store) {
    return <p className="text-xs text-ink-faint">Connecting to gate feed…</p>;
  }
  const Icon = live ? Pause : Play;
  return (
    <div className={`flex items-center gap-2.5 ${compact ? "" : "rounded-xl border border-line bg-field px-3 py-2.5"}`}>
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${live ? "dot-pulse bg-live" : "bg-ink-faint"}`} />
      {!compact && (
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[0.8125rem] font-semibold text-ink">{live ? "Simulated feed live" : "Feed paused"}</p>
          <p className="text-xs text-ink-muted">Demo data, not real gate taps</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => store.setLive(!live)}
        aria-label={live ? "Pause simulated feed" : "Resume simulated feed"}
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-line-strong text-ink-soft transition-colors hover:border-gold/50 hover:text-ink"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function SignOut({ children, className }: { children: React.ReactNode; className: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => router.push("/")}
    >
      {children}
    </button>
  );
}

export function ConsoleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading console" className="space-y-5">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-white/[0.05]" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-44 animate-pulse rounded-2xl bg-white/[0.04] lg:col-span-2" />
        <div className="h-44 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/[0.04]" />
    </div>
  );
}

export function ConsoleShell({
  adminName,
  adminEmail,
  children,
}: {
  adminName: string;
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="min-h-svh bg-canvas">
        {/* Sidebar — desktop */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-canvas px-3 py-4 lg:flex">
          <Link href="/admin" className="brand-mark flex items-center gap-2.5 rounded-lg px-2 py-1.5" aria-label="SPARC admin home">
            <SparcSeal size={36} priority className="size-9" />
            <div className="leading-tight">
              <SparcWordmark className="text-xl text-ink" />
              <p className="text-xs text-ink-muted">Admin console</p>
            </div>
          </Link>

          <nav aria-label="Console" className="mt-7 flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className="side-link">
                <Icon className="size-[1.125rem]" strokeWidth={2} aria-hidden />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <FeedControl />
            <Link href="/slots" className="side-link">
              <ExternalLink className="size-[1.125rem]" strokeWidth={2} aria-hidden />
              Driver availability page
            </Link>
            <div className="flex items-center gap-2.5 border-t border-line px-1 pt-3">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 font-display text-sm font-bold text-gold"
              >
                {adminName.charAt(0)}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold text-ink">{adminName}</p>
                <p className="truncate text-xs text-ink-muted">{adminEmail}</p>
              </div>
              <SignOut className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.05] hover:text-ink">
                <LogOut className="size-4" aria-hidden />
                <span className="sr-only">Back to the SPARC website</span>
              </SignOut>
            </div>
          </div>
        </aside>

        {/* Top bar — phone and tablet */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
          <Link href="/admin" className="brand-mark flex items-center gap-2.5 rounded-lg" aria-label="SPARC admin home">
            <SparcSeal size={30} className="size-[1.875rem]" />
            <SparcWordmark className="text-lg text-ink" />
            <span className="text-xs text-ink-muted">Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <FeedControl compact />
            <SignOut className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:text-ink">
              <LogOut className="size-[1.125rem]" aria-hidden />
              <span className="sr-only">Back to the SPARC website</span>
            </SignOut>
          </div>
        </header>

        <main id="main-content" className="px-4 pt-5 pb-28 sm:px-6 lg:pl-[calc(16rem+2rem)] lg:pr-8 lg:pt-8 lg:pb-12">
          <div className="mx-auto max-w-[84rem]">
            <SparcGate fallback={<ConsoleSkeleton />}>{children}</SparcGate>
          </div>
        </main>

        {/* Tab bar — phone and tablet */}
        <nav
          aria-label="Console"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        >
          {NAV.map(({ href, short, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors ${
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
    </ToastProvider>
  );
}
