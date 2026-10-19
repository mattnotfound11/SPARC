const entries = [
  { time: "07:42", plate: "ABC 1234", who: "Faculty", status: "In", tone: "live" },
  { time: "07:44", plate: "XYZ 8820", who: "Student", status: "In", tone: "live" },
  { time: "07:51", plate: "LMN 4417", who: "Visitor", status: "Manual", tone: "gold" },
  { time: "08:03", plate: "QRS 9901", who: "Student", status: "Out", tone: "muted" },
];

const dot: Record<string, string> = {
  live: "bg-live",
  gold: "bg-gold",
  muted: "bg-ink-faint",
};

/** Tamper-evident entry log, synced to the cloud. */
export function AuditLogDemo() {
  return (
    <div className="rounded-2xl border border-line bg-[#0b0e15] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-soft">Entry log · today</p>
        <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[0.6875rem] text-ink-muted">
          1,284 rows
        </span>
      </div>

      <ul className="mt-4 divide-y divide-white/[0.05]">
        {entries.map(({ time, plate, who, status, tone }) => (
          <li key={time + plate} className="flex items-center gap-3 py-3">
            <span className={`size-1.5 shrink-0 rounded-full ${dot[tone]}`} aria-hidden />
            <span className="font-mono text-xs text-ink-faint">{time}</span>
            <span className="flex-1 truncate text-[0.875rem] text-ink-soft">{plate}</span>
            <span className="hidden text-xs text-ink-muted sm:inline">{who}</span>
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[0.6875rem] font-medium text-ink-soft">
              {status}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-ink-faint">Exported to the admin dashboard — no clipboards, no paper slips.</p>
    </div>
  );
}
