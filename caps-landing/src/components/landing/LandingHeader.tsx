import Link from "next/link";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";

export function LandingHeader() {
  return (
    <header className="sticky top-3 z-40 px-4 pt-3 sm:px-6">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-line bg-surface/85 py-2.5 pr-2.5 pl-4 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md"
      >
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="SPARC home">
          <SparcSeal size={30} priority />
          <SparcWordmark className="text-[1.05rem] text-ink" />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-white/25 hover:bg-white/[0.07]"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="gold-glow rounded-lg bg-gold px-3.5 py-2 text-[0.8125rem] font-semibold text-on-gold transition-colors hover:bg-gold-bright"
          >
            Register Vehicle
          </Link>
        </div>
      </nav>
    </header>
  );
}
