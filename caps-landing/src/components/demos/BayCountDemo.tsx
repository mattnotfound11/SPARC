import { CountUp } from "@/components/ui/CountUp";

const decks = [
  { name: "Ground deck", free: 12, total: 96, tone: "crimson" },
  { name: "Level 2", free: 48, total: 120, tone: "gold" },
  { name: "Level 3", free: 73, total: 134, tone: "live" },
];

const bar: Record<string, string> = {
  crimson: "bg-crimson",
  gold: "bg-gold",
  live: "bg-live",
};

/** Live occupancy per deck. */
export function BayCountDemo() {
  return (
    <div className="rounded-2xl border border-line bg-[#0b0e15] p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-ink-soft">Available now</p>
        <p className="font-display text-3xl font-semibold tracking-tight text-ink">
          <CountUp to={133} />
          <span className="text-base font-normal text-ink-faint"> / 350</span>
        </p>
      </div>

      <ul className="mt-5 space-y-4">
        {decks.map(({ name, free, total, tone }, i) => {
          const pct = Math.round((free / total) * 100);
          return (
            <li key={name}>
              <div className="flex items-center justify-between text-[0.8125rem]">
                <span className="text-ink-soft">{name}</span>
                <span className="font-mono text-ink-muted">
                  {free} free · {total}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`bar-grow h-full rounded-full ${bar[tone]}`}
                  style={{ width: `${pct}%`, "--bar-delay": `${i * 140}ms` } as React.CSSProperties}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 flex items-center gap-2 text-xs text-ink-faint">
        <span className="dot-pulse size-1.5 rounded-full bg-live" />
        Updating every second from gate sensors
      </p>
    </div>
  );
}
