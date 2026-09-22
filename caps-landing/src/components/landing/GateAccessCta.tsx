import Link from "next/link";

export function GateAccessCta() {
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-[clamp(3rem,7vh,5rem)] sm:px-6">
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 overflow-hidden rounded-3xl border border-line-strong bg-surface-raised px-7 py-9 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] sm:flex-row sm:items-center sm:justify-between sm:px-12 sm:py-11">
        {/* Faint top sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
        <div>
          <h2 id="cta-title" className="font-display text-[clamp(1.625rem,2.6vw,2.25rem)] font-bold tracking-tight text-ink">
            Get Campus Gate Access
          </h2>
          <p className="mt-2 text-base text-ink-muted lg:text-[1.0625rem]">
            Register your license plate and synchronize your USA ID badge today.
          </p>
        </div>
        <Link
          href="/signup"
          className="btn btn-gold gold-glow shrink-0 rounded-xl bg-gold px-8 py-4 text-base font-semibold text-on-gold"
        >
          Register Vehicle RFID
        </Link>
      </div>
    </section>
  );
}
