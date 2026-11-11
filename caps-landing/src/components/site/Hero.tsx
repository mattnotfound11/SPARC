import { GlowField } from "@/components/ui/GlowField";
import { Reveal } from "@/components/ui/Reveal";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <GlowField className="hero-drift" />

      <div className="mx-auto flex min-h-[min(880px,calc(100svh-var(--header-h)))] max-w-5xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
        <Reveal delay={90}>
          <h1 id="hero-title" className="display-xl text-[clamp(2.75rem,7.4vw,4.75rem)] text-ink">
            <span className="line-mask" style={{ "--line-delay": "120ms" } as React.CSSProperties}>
              <span>Smart parking access</span>
            </span>
            <span className="line-mask" style={{ "--line-delay": "260ms" } as React.CSSProperties}>
              <span>for a campus that never waits.</span>
            </span>
          </h1>
        </Reveal>

        <Reveal delay={170}>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted sm:text-lg">
            Tap your Augustinian card, the barrier lifts in under a second, and every bay on campus is
            counted in real time.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm text-ink-faint">
            <span className="dot-pulse size-1.5 rounded-full bg-live" aria-hidden />
            350 bays monitored · 4 gates · University of San Agustin
          </p>
        </Reveal>
      </div>
    </section>
  );
}
