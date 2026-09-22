import Link from "next/link";
import { ChevronsDown } from "lucide-react";
import { SealBackdrop } from "@/components/brand/SealBackdrop";
import { SparcWordmark } from "@/components/brand/SparcWordmark";

export function LandingHero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-[76px] pt-[76px]">
      <SealBackdrop size="min(1040px, 140vw)" centerY="46%" opacity={0.27} className="-z-10" />
      {/* Fade the watermark into the page canvas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-b from-transparent to-canvas"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-16 sm:pb-12">
        <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-3 py-1 text-center text-[0.625rem] leading-snug font-semibold tracking-[0.08em] text-gold uppercase sm:text-[0.6875rem]">
          <span aria-hidden className="size-1.5 rounded-full bg-gold" />
          University of San Agustin • Campus Transit &amp; Parking
        </p>

        <h1 id="hero-title" className="mt-7">
          <SparcWordmark className="block text-[clamp(4.25rem,15vw,6rem)] leading-[0.95] text-ink animate-fade-up [animation-delay:60ms]" />
          <span className="animate-fade-up mt-3 block font-display text-[clamp(1.75rem,5vw,2.75rem)] leading-tight font-bold tracking-tight text-ink [animation-delay:120ms]">
            Smart Parking, done right.
          </span>
        </h1>

        <p className="animate-fade-up mt-5 max-w-[34rem] text-[0.975rem] leading-relaxed text-ink-soft [animation-delay:180ms] sm:text-lg">
          No paper tickets, no manual logging. Tap your Augustinian RFID card in milliseconds —
          campus marshals and drivers see real-time available slots and bay status instantly.
        </p>

        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:240ms]">
          <Link
            href="/login"
            className="gold-glow rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-on-gold transition-colors hover:bg-gold-bright"
          >
            Check Available Slots
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-line-strong bg-white/[0.06] px-6 py-3.5 text-[0.9375rem] font-semibold text-ink transition-colors hover:border-white/25 hover:bg-white/[0.1]"
          >
            Log In
          </Link>
        </div>

        <ul
          aria-label="SPARC at a glance"
          className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-line bg-canvas/70 px-4 py-2 text-xs font-medium text-ink-soft [animation-delay:300ms]"
        >
          <li className="flex items-center gap-1.5 text-ink">
            <span aria-hidden className="size-1.5 rounded-full bg-live shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
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
          className="mt-12 grid size-10 place-items-center rounded-full border border-line-strong bg-surface-raised/80 text-gold transition-colors hover:border-gold/50 hover:bg-surface-raised"
        >
          <ChevronsDown className="size-4 animate-float-y" strokeWidth={2.25} />
        </a>
      </div>
    </section>
  );
}
