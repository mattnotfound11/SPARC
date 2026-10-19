import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GlowField } from "@/components/ui/GlowField";
import { Reveal } from "@/components/ui/Reveal";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <GlowField />

      <div className="mx-auto flex min-h-[min(880px,calc(100svh-var(--header-h)))] max-w-5xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface/80 py-1.5 pr-4 pl-1.5 text-sm text-ink-soft">
            <span className="rounded-md bg-gold px-2 py-0.5 text-xs font-semibold text-on-gold">Live</span>
            RFID gate access · University of San Agustin
          </p>
        </Reveal>

        <Reveal delay={90}>
          <h1
            id="hero-title"
            className="display-xl mt-8 text-[clamp(2.75rem,7.4vw,4.75rem)] text-ink"
          >
            Smart parking access for a campus that never waits.
          </h1>
        </Reveal>

        <Reveal delay={170}>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted sm:text-lg">
            Tap your Augustinian card, the barrier lifts in under a second, and every bay on campus is
            counted in real time.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn btn-gold px-6 py-3.5 text-[0.9375rem]">
              Register your vehicle
              <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
            </Link>
            <Link href="/login" className="btn btn-ghost px-6 py-3.5 text-[0.9375rem]">
              Check available slots
            </Link>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm text-ink-faint">
            <span className="dot-pulse size-1.5 rounded-full bg-live" aria-hidden />
            350 bays monitored across 4 campus gates
          </p>
        </Reveal>
      </div>
    </section>
  );
}
