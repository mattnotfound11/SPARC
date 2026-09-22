import Link from "next/link";
import { ChevronsDown } from "lucide-react";
import { SealBackdrop } from "@/components/brand/SealBackdrop";
import { SparcWordmark } from "@/components/brand/SparcWordmark";

export function LandingHero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-[76px] pt-[76px]">
      {/* Viewport-height box from the top of the page, as in the reference */}
      <SealBackdrop size="min(810px, 118vw)" opacity={0.12} blur={0.5} className="inset-x-0 top-0 -z-10 h-svh max-h-[1000px]" />

      <div className="fade-in delay-1 mx-auto flex max-w-3xl flex-col items-center px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-16 sm:pb-12">
        <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-3 py-1 text-center text-[0.625rem] leading-snug font-semibold tracking-[0.08em] text-gold uppercase sm:text-[0.6875rem]">
          <span aria-hidden className="size-1.5 rounded-full bg-gold" />
          University of San Agustin • Campus Transit &amp; Parking
        </p>

        <h1 id="hero-title" className="mt-7">
          <SparcWordmark className="block text-[clamp(4.25rem,15vw,6rem)] leading-[0.95] text-ink" />
          <span className="mt-3 block font-display text-[clamp(1.75rem,5vw,2.75rem)] leading-tight font-bold tracking-tight text-ink">
            Smart Parking, done right.
          </span>
        </h1>

        <p className="mt-5 max-w-[34rem] text-[0.975rem] leading-relaxed text-ink-soft sm:text-lg">
          No paper tickets, no manual logging. Tap your Augustinian RFID card in milliseconds —
          campus marshals and drivers see real-time available slots and bay status instantly.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="btn btn-gold pulse-gold gold-glow rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-on-gold"
          >
            Check Available Slots
          </Link>
          <Link
            href="/login"
            className="btn btn-outline rounded-xl border border-line-strong bg-white/[0.06] px-6 py-3.5 text-[0.9375rem] font-semibold text-ink"
          >
            Log In
          </Link>
        </div>

        <ul
          aria-label="SPARC at a glance"
          className="mt-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-line bg-canvas/70 px-4 py-2 text-xs font-medium text-ink-soft"
        >
          <li className="flex items-center gap-1.5 text-ink">
            <span aria-hidden className="dot-pulse size-1.5 rounded-full bg-live shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            350+ Campus Slots
          </li>
          <li aria-hidden className="text-ink-faint">•</li>
          <li className="text-gold">&lt;0.5s Tap Time</li>
          <li aria-hidden className="text-ink-faint">•</li>
          <li>Live Gate Telemetry</li>
        </ul>

        <a
          href="#features"
          aria-label="Scroll to features"
          className="scroll-circle fade-in delay-2 mt-12 grid size-10 place-items-center rounded-full border border-line-strong bg-surface-raised/80 text-gold"
        >
          <ChevronsDown className="size-4" strokeWidth={2.25} />
        </a>
      </div>
    </section>
  );
}
