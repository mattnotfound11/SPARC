import Link from "next/link";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";

export function LandingHeader() {
  return (
    <header className="fade-in sticky top-3 z-40 h-[var(--header-h)] px-4 sm:px-6">
      <nav
        aria-label="Primary"
        className="mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-2xl border border-line bg-surface/85 py-2.5 pr-2.5 pl-4 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md sm:py-3 sm:pr-3 sm:pl-5"
      >
        <Link href="/" className="flex items-center gap-2.5 rounded-lg sm:gap-3" aria-label="SPARC home">
          <SparcSeal size={40} priority className="size-8 sm:size-10" />
          <SparcWordmark className="text-lg text-ink sm:text-xl" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/login"
            className="btn btn-outline rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-ink sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-[0.9375rem]"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="btn btn-gold gold-glow rounded-lg bg-gold px-3.5 py-2 text-sm font-semibold text-on-gold sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-[0.9375rem]"
          >
            Register Vehicle
          </Link>
        </div>
      </nav>
    </header>
  );
}
