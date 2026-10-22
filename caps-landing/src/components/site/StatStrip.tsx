const stats = [
  "0.41s average tap-to-lift",
  "350 bays counted live",
  "4 gates on one dashboard",
  "Zero paper entry slips",
  "1,284 entries logged today",
  "100% plate-matched records",
];

/** Continuous marquee of operating facts. */
export function StatStrip() {
  return (
    <section aria-label="SPARC at a glance" className="border-y border-line bg-surface/40 py-5">
      <div className="marquee-mask overflow-hidden">
        <ul className="marquee-track flex w-max items-center gap-10 pr-10">
          {[...stats, ...stats].map((stat, i) => (
            <li
              key={i}
              aria-hidden={i >= stats.length}
              className="flex shrink-0 items-center gap-3 text-sm text-ink-muted"
            >
              <span className="size-1 rounded-full bg-gold/70" aria-hidden />
              {stat}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
