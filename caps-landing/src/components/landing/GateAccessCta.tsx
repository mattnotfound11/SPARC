import Link from "next/link";

export function GateAccessCta() {
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="relative mx-auto flex max-w-[54rem] flex-col items-start gap-6 overflow-hidden rounded-3xl border border-line-strong bg-surface-raised px-7 py-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-9">
        {/* Faint top sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
        <div>
          <h2 id="cta-title" className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
            Get Campus Gate Access
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            Register your license plate and synchronize your USA ID badge today.
          </p>
        </div>
        <Link
          href="/signup"
          className="gold-glow shrink-0 rounded-xl bg-gold px-6 py-3.5 text-sm font-semibold text-on-gold transition-colors hover:bg-gold-bright"
        >
          Register Vehicle RFID
        </Link>
      </div>
    </section>
  );
}
