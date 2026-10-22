"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#benefits", label: "Benefits" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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
          <Link href="/login" className="btn btn-ghost hidden px-4 py-2 text-sm sm:inline-flex">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-gold px-4 py-2 text-sm sm:px-5">
            Register vehicle
          </Link>
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
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-3 text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink"
              >
                Log in
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
