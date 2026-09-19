"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * SiteHeader — logo + tagline + Login button.
 * Transitions from transparent to frosted glass on scroll.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? window.scrollY / docHeight : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`relative w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0B0A0F]/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/20"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 lg:px-12 py-4">
        {/* Left: Logo + tagline */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-4 group">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 transition-transform duration-300 group-hover:scale-105"
              aria-hidden="true"
            >
              <ShieldCheck
                style={{ width: "var(--icon-md)", height: "var(--icon-md)" }}
                strokeWidth={2}
              />
            </span>
            <span className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              SPARC
            </span>
          </Link>

          <span
            className="hidden text-base font-medium text-[var(--color-muted-foreground)] lg:inline-block border-l border-white/[0.08] pl-5 ml-2"
            aria-hidden="true"
          >
            Smart Parking Access and Real-Time Count
          </span>
        </div>

        {/* Right: Login button */}
        <a
          href="#login"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-7 text-base font-semibold tracking-wide text-white shadow-md shadow-[var(--color-primary)]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-primary)]/30 hover:brightness-110 active:scale-[0.97]"
        >
          Log In
        </a>
      </div>

      {/* Scroll progress bar */}
      <div
        className="scroll-progress absolute bottom-0 left-0 w-full"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />
    </header>
  );
}
