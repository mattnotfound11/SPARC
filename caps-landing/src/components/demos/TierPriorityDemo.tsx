const rows = [
  { label: "Faculty & administrators", zone: "Ground deck", tone: "gold" },
  { label: "Registered students", zone: "Levels 2–3", tone: "soft" },
  { label: "Campus service vehicles", zone: "Service bay", tone: "soft" },
  { label: "Unregistered plate", zone: "Held at gate", tone: "crimson" },
];

/** Who gets which zone. */
export function TierPriorityDemo() {
  return (
    <div className="rounded-2xl border border-line bg-[#0b0e15] p-5 sm:p-6">
      <p className="text-sm font-medium text-ink-soft">Zoning rules</p>
      <ul className="mt-4 space-y-2.5">
        {rows.map(({ label, zone, tone }) => (
          <li
            key={label}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
              tone === "gold"
                ? "border-gold/25 bg-gold/[0.07]"
                : tone === "crimson"
                  ? "border-crimson/25 bg-crimson/[0.07]"
                  : "border-line bg-surface/60"
            }`}
          >
            <span className="truncate text-[0.875rem] text-ink-soft">{label}</span>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[0.6875rem] font-semibold tracking-wide uppercase ${
                tone === "gold"
                  ? "bg-gold/15 text-gold"
                  : tone === "crimson"
                    ? "bg-crimson/15 text-crimson"
                    : "bg-white/[0.06] text-ink-muted"
              }`}
            >
              {zone}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
