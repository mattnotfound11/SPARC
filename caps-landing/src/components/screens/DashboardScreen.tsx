import { BarChart3, Car, FileText, LayoutDashboard, Settings, Shield } from "lucide-react";

const nav = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Gates", icon: Shield },
  { label: "Vehicles", icon: Car },
  { label: "Entry log", icon: FileText },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

const stats = [
  { label: "Occupied now", value: "217", sub: "of 350 bays", tone: "gold" },
  { label: "Entries today", value: "1,284", sub: "+8% vs Tue", tone: "live" },
  { label: "Avg tap-to-lift", value: "0.41s", sub: "across 4 gates", tone: "plain" },
  { label: "Held at gate", value: "3", sub: "awaiting marshal", tone: "crimson" },
];

const decks = [
  { name: "Ground deck", used: 88, total: 96 },
  { name: "Level 2", used: 72, total: 120 },
  { name: "Level 3", used: 57, total: 134 },
];

const feed = [
  { time: "07:42:11", plate: "ABC 1234", role: "Faculty", gate: "Gate 1", status: "Granted" },
  { time: "07:42:04", plate: "XYZ 8820", role: "Student", gate: "Gate 2", status: "Granted" },
  { time: "07:41:52", plate: "LMN 4417", role: "Visitor", gate: "Gate 1", status: "Manual" },
  { time: "07:41:38", plate: "QRS 9901", role: "Student", gate: "Gate 3", status: "Granted" },
  { time: "07:41:19", plate: "TUV 2043", role: "Unknown", gate: "Gate 2", status: "Held" },
];

const hours = [28, 44, 62, 91, 120, 104, 76, 58, 49, 63, 82, 51];

export function DashboardScreen() {
  return (
    <div className="flex h-full w-full bg-canvas text-ink">
      {/* Sidebar */}
      <aside className="flex w-[228px] shrink-0 flex-col border-r border-line bg-surface/60 p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-gold text-[14px] font-bold text-on-gold">S</span>
          <span className="font-display text-[17px] font-semibold tracking-tight">
            SPAR<span className="text-gold">C</span>
          </span>
        </div>
        <ul className="mt-8 space-y-1.5">
          {nav.map(({ label, icon: Icon, active }) => (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] ${
                active ? "bg-gold/12 text-gold" : "text-ink-muted"
              }`}
            >
              <Icon className="size-[17px]" strokeWidth={1.75} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
        <div className="mt-auto rounded-xl border border-line bg-white/[0.03] p-4">
          <p className="text-[12px] text-ink-faint">Signed in as</p>
          <p className="mt-1 text-[13px] font-medium">Campus Marshal · Gate 1</p>
        </div>
      </aside>

      {/* Main */}
      <section className="flex-1 overflow-hidden p-8">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="display text-[24px]">Campus parking overview</h2>
            <p className="mt-1 text-[13px] text-ink-muted">Wednesday · 07:42 · live</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-2 rounded-lg border border-line bg-surface/70 px-3.5 py-2 text-[13px] text-ink-soft">
              <span className="dot-pulse size-1.5 rounded-full bg-live" />
              All gates online
            </span>
            <span className="rounded-lg bg-gold px-4 py-2 text-[13px] font-semibold text-on-gold">Export day</span>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-4 gap-4">
          {stats.map(({ label, value, sub, tone }) => (
            <div key={label} className="rounded-xl border border-line bg-surface/70 p-4">
              <p className="text-[12px] text-ink-muted">{label}</p>
              <p
                className={`mt-2 font-display text-[26px] font-semibold tracking-tight ${
                  tone === "gold"
                    ? "text-gold"
                    : tone === "live"
                      ? "text-live"
                      : tone === "crimson"
                        ? "text-crimson"
                        : "text-ink"
                }`}
              >
                {value}
              </p>
              <p className="mt-1 text-[12px] text-ink-faint">{sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-[1.25fr_1fr] gap-5">
          {/* Live feed */}
          <div className="rounded-xl border border-line bg-surface/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium">Live gate feed</p>
              <p className="text-[12px] text-ink-faint">last 60 seconds</p>
            </div>
            <table className="mt-3 w-full text-left">
              <thead>
                <tr className="text-[11px] tracking-wide text-ink-faint uppercase">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Plate</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Gate</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {feed.map((row) => (
                  <tr key={row.time} className="text-[13px]">
                    <td className="py-2.5 font-mono text-[12px] text-ink-faint">{row.time}</td>
                    <td className="py-2.5 text-ink-soft">{row.plate}</td>
                    <td className="py-2.5 text-ink-muted">{row.role}</td>
                    <td className="py-2.5 text-ink-muted">{row.gate}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          row.status === "Granted"
                            ? "bg-live/15 text-live"
                            : row.status === "Manual"
                              ? "bg-gold/15 text-gold"
                              : "bg-crimson/15 text-crimson"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Occupancy + chart */}
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-line bg-surface/70 p-5">
              <p className="text-[14px] font-medium">Occupancy by deck</p>
              <ul className="mt-3.5 space-y-3">
                {decks.map(({ name, used, total }) => (
                  <li key={name}>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-ink-soft">{name}</span>
                      <span className="font-mono text-ink-muted">
                        {used}/{total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full ${used / total > 0.85 ? "bg-crimson" : used / total > 0.6 ? "bg-gold" : "bg-live"}`}
                        style={{ width: `${Math.round((used / total) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1 rounded-xl border border-line bg-surface/70 p-5">
              <p className="text-[14px] font-medium">Entries by hour</p>
              <div className="mt-4 flex h-[92px] items-end gap-2">
                {hours.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-[3px] ${i === 4 ? "bg-gold" : "bg-white/[0.14]"}`}
                    style={{ height: `${(h / 120) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
