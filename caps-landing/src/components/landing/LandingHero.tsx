import Link from "next/link";
import { ChevronsDown } from "lucide-react";
import { SealBackdrop } from "@/components/brand/SealBackdrop";
import { SparcWordmark } from "@/components/brand/SparcWordmark";

export function LandingHero() {
  return (
    // Fills exactly the first screen (under the floating header), like the reference.
    <section
      aria-labelledby="hero-title"
      className="relative isolate -mt-[var(--header-h)] flex min-h-svh flex-col pt-[var(--header-h)]"
    >
      <SealBackdrop
        size="min(clamp(560px, 56vw, 1000px), 118vw)"
        opacity={0.12}
        blur={0.5}
        className="inset-0 -z-10"
      />

      <div className="fade-in delay-1 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pt-8 pb-24 text-center sm:px-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-3.5 py-1.5 text-center text-[0.6875rem] leading-snug font-semibold tracking-[0.08em] text-gold uppercase sm:px-4 sm:text-xs">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-gold" />
          University of San Agustin • Campus Transit &amp; Parking
        </p>

        <h1 id="hero-title" className="mt-[clamp(1.5rem,3.5vh,2.5rem)]">
          <SparcWordmark className="block text-[clamp(4.5rem,11vw,8rem)] leading-[0.92] text-ink" />
          <span className="mt-[clamp(0.75rem,1.6vh,1.25rem)] block font-display text-[clamp(1.875rem,4.2vw,3.5rem)] leading-tight font-bold tracking-tight text-ink">
            Smart Parking, done right.
          </span>
        </h1>

        <p className="mt-[clamp(1rem,2.4vh,1.75rem)] max-w-[42rem] text-[clamp(1.0625rem,1.35vw,1.3125rem)] leading-relaxed text-ink-soft">
          No paper tickets, no manual logging. Tap your Augustinian RFID card in milliseconds —
          campus marshals and drivers see real-time available slots and bay status instantly.
        </p>

        <div className="mt-[clamp(1.75rem,4vh,2.75rem)] flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="btn btn-gold pulse-gold gold-glow rounded-xl bg-gold px-7 py-4 text-base font-semibold text-on-gold sm:px-9 sm:text-[1.0625rem]"
          >
            Check Available Slots
          </Link>
          <Link
            href="/login"
            className="btn btn-outline rounded-xl border border-line-strong bg-white/[0.06] px-7 py-4 text-base font-semibold text-ink sm:px-9 sm:text-[1.0625rem]"
          >
            Log In
          </Link>
        </div>

        <ul
          aria-label="SPARC at a glance"
          className="mt-[clamp(1.5rem,3.2vh,2.25rem)] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-line bg-canvas/70 px-5 py-2.5 text-[0.8125rem] font-medium text-ink-soft sm:text-sm"
        >
          <li className="flex items-center gap-2 text-ink">
            <span aria-hidden className="dot-pulse size-2 rounded-full bg-live shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            350+ Campus Slots
          </li>
          <li aria-hidden className="text-ink-faint">•</li>
          <li className="text-gold">&lt;0.5s Tap Time</li>
          <li aria-hidden className="text-ink-faint">•</li>
          <li>Live Gate Telemetry</li>
        </ul>
      </div>

      <a
        href="#features"
        aria-label="Scroll to features"
        className="scroll-circle fade-in delay-2 absolute bottom-[clamp(1.25rem,4vh,2.5rem)] left-1/2 -ml-6 grid size-12 place-items-center rounded-full border border-line-strong bg-surface-raised/80 text-gold"
      >
        <ChevronsDown className="size-5" strokeWidth={2.25} />
      </a>
    </section>
  );
}
