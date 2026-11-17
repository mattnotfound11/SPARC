"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";
import { ToastProvider } from "@/components/console/ui";
import { useEnter } from "@/hooks/useConsoleMotion";
import { DEMO_CARD, DEMO_CARD_LABEL, portal } from "@/lib/portal/store";
import { useAlerts } from "@/lib/portal/useAlerts";
import { setDriverCard, useDriverCard } from "@/lib/portal/usePortal";
import { EventBanner } from "./EventBanner";
import { cardKey, normalizeNfc } from "@/lib/sparc/store";

const NAV = [
  { href: "/portal", label: "Vehicles" },
  { href: "/portal/violations", label: "Violations" },
  { href: "/portal/visitors", label: "Visitors" },
  { href: "/portal/parking", label: "Parking" },
  { href: "/portal/alerts", label: "Alerts" },
] as const;

/** The unread count next to "Alerts". */
function UnreadDot({ card }: { card: string }) {
  const { unread } = useAlerts(card);
  if (!unread) return null;
  return (
    <span className="num ml-1.5 inline-grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[0.6875rem] font-bold leading-5 text-canvas">
      {unread}
      <span className="sr-only"> unread</span>
    </span>
  );
}

const isActive = (pathname: string, href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

function CardEntry() {
  const root = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEnter(root);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (cardKey(value).length < 8) {
      setError("Enter the card number printed on your SPARC campus ID.");
      return;
    }
    if (cardKey(value) === DEMO_CARD) portal.seedDemo();
    setDriverCard(value);
  }

  function useDemo() {
    portal.seedDemo();
    setDriverCard(DEMO_CARD);
  }

  return (
    <div ref={root} className="mx-auto max-w-md pt-10 sm:pt-16">
      <h1 data-enter className="display text-[1.875rem] text-ink sm:text-[2.25rem]">
        Driver portal
      </h1>
      <p data-enter className="mt-2 text-ink-muted">
        Manage your vehicles and see any parking violations. Enter your campus card number to continue.
      </p>
      <form data-enter onSubmit={submit} noValidate className="mt-6">
        <label htmlFor="portal-card" className="mb-1.5 block text-sm font-semibold text-ink">
          Card number
        </label>
        <input
          id="portal-card"
          className="c-input w-full font-mono"
          inputMode="numeric"
          autoComplete="off"
          placeholder="1234-5678-9012"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "portal-card-error" : "portal-card-hint"}
        />
        {error ? (
          <p id="portal-card-error" role="alert" className="mt-1.5 text-[0.8125rem] text-[#ff9aab]">
            {error}
          </p>
        ) : (
          <p id="portal-card-hint" className="mt-1.5 text-[0.8125rem] text-ink-muted">
            Prototype sign-in: this will use your campus account once it is connected.
          </p>
        )}
        <button type="submit" className="c-btn c-btn-gold mt-4 w-full">
          Continue
        </button>
      </form>
      <div data-enter className="mt-6 rounded-xl border border-line bg-field/60 p-4">
        <p className="text-sm font-semibold text-ink">Demo account</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
          Card <span className="font-mono text-ink-soft">{DEMO_CARD_LABEL}</span> comes with two vehicles, violations (one under appeal), two strikes and visitor passes.
        </p>
        <button type="button" className="c-btn mt-3 w-full" onClick={useDemo}>
          Sign in as the demo driver
        </button>
      </div>
    </div>
  );
}

/** Frame for the driver pages: header, nav, and a card gate before any page content. */
export function PortalShell({ children }: { children: (card: string) => React.ReactNode }) {
  const pathname = usePathname();
  const card = useDriverCard();

  return (
    <ToastProvider>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <nav aria-label="Driver portal" className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="brand-mark flex items-center gap-2.5 rounded-lg" aria-label="SPARC home">
            <SparcSeal size={32} priority className="size-8" />
            <SparcWordmark className="hidden text-lg text-ink min-[480px]:inline" />
          </Link>
          {card && (
            <div className="flex min-w-0 items-center gap-1">
              <ul className="flex min-w-0 items-center gap-1 overflow-x-auto">
                {NAV.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isActive(pathname, href) ? "page" : undefined}
                      className="side-link !min-h-9 !px-3 !text-sm"
                    >
                      {label}
                      {href === "/portal/alerts" && <UnreadDot card={card} />}
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setDriverCard("")}
                aria-label={`Sign out card ${normalizeNfc(card)}`}
                className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.05] hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </nav>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        {card ? <div className="mb-5"><EventBanner /></div> : null}
        {card === null ? null : card === "" ? <CardEntry /> : children(card)}
      </main>
    </ToastProvider>
  );
}
