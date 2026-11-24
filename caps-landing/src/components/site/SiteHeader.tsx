"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Menu, UserRound, X } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";
import { useAdminSession, useMemberSession } from "@/lib/session";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#benefits", label: "Benefits" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const session = useAdminSession();
  const staffIn = session.status === "in" && !session.open;
  const member = useMemberSession();
  const memberIn = member.status === "in";

  return (
    <header className="header-shell sticky top-0 z-50 h-[var(--header-h)] border-b border-line/0 bg-canvas/60 backdrop-blur-xl">
      <nav aria-label="Primary" className="mx-auto flex h-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="brand-mark flex items-center gap-2.5 rounded-lg" aria-label="SPARC home">
          <SparcSeal size={36} priority className="size-8 sm:size-9" />
          <SparcWordmark className="text-lg text-ink sm:text-xl" />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className="nav-link rounded-lg px-3.5 py-2 text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {!staffIn && (
            <Link
              href="/admin/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink md:inline-flex"
            >
              Staff sign in
            </Link>
          )}
          {staffIn ? (
            <Link href="/admin" className="btn btn-ghost px-4 py-2 text-sm">
              <LayoutDashboard className="size-4" aria-hidden />
              Dashboard
            </Link>
          ) : memberIn ? (
            <Link href="/member" className="btn btn-gold px-4 py-2 text-sm">
              <UserRound className="size-4" aria-hidden />
              My pass
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hidden px-4 py-2 text-sm min-[380px]:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-gold px-4 py-2 text-sm">
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="btn btn-ghost size-10 md:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-nav" className="border-t border-line bg-canvas/95 px-5 py-3 backdrop-blur-xl md:hidden">
          <ul className="flex flex-col">
            {links.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink"
                >
                  {label}
                </a>
              </li>
            ))}
            {!staffIn && !memberIn && (
              <li className="grid grid-cols-2 gap-2 px-1 py-3">
                <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost justify-center py-2.5 text-sm">
                  Log in
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="btn btn-gold justify-center py-2.5 text-sm">
                  Sign up
                </Link>
              </li>
            )}
            {!staffIn && (
              <li>
                <Link
                  href="/admin/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink"
                >
                  Staff sign in
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
