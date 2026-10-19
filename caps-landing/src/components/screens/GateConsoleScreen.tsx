import { Check, Nfc } from "lucide-react";

const queue = [
  { plate: "XYZ 8820", role: "Student", state: "Reading" },
  { plate: "LMN 4417", role: "Visitor", state: "Queued" },
  { plate: "TUV 2043", role: "Unknown", state: "Hold" },
];

export function GateConsoleScreen() {
  return (
    <div className="flex h-full w-full flex-col bg-canvas p-9 text-ink">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-gold text-[15px] font-bold text-on-gold">S</span>
          <div>
            <p className="font-display text-[17px] font-semibold tracking-tight">Gate console</p>
            <p className="text-[12px] text-ink-muted">Gate 1 · General Luna entrance</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-line bg-surface/70 px-3.5 py-2 text-[13px] text-ink-soft">
          <span className="dot-pulse size-1.5 rounded-full bg-live" />
          Reader online · 07:42
        </span>
      </header>

      <div className="mt-7 grid flex-1 grid-cols-[1.4fr_1fr] gap-6">
        {/* Current tap */}
        <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl border border-live/30 bg-live/[0.07] p-9">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
              <Nfc className="size-7" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="font-mono text-[13px] text-ink-muted">USA-2026-04817</p>
              <p className="font-display text-[30px] leading-tight font-semibold">Dexter M. Alvarez</p>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-xl bg-live px-4 py-2.5 text-[15px] font-bold text-[#06220f]">
              <Check className="size-4" strokeWidth={3} aria-hidden />
              Access granted
            </span>
            <span className="font-mono text-[14px] text-live/90">0.41s</span>
          </div>

          <dl className="mt-8 grid grid-cols-3 gap-3">
            {[
              ["Plate", "ABC 1234"],
              ["Role", "Faculty"],
              ["Zone", "Ground deck"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-canvas/60 px-4 py-3">
                <dt className="text-[11px] tracking-wide text-ink-faint uppercase">{k}</dt>
                <dd className="mt-1 text-[14px] text-ink-soft">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-7 text-[13px] text-ink-muted">Barrier lifted · entry written to the campus log</p>
        </div>

        {/* Queue + counts */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-line bg-surface/70 p-6">
            <p className="text-[14px] font-medium">At the reader</p>
            <ul className="mt-3.5 space-y-2.5">
              {queue.map(({ plate, role, state }) => (
                <li
                  key={plate}
                  className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 px-4 py-3"
                >
                  <div>
                    <p className="text-[14px] text-ink-soft">{plate}</p>
                    <p className="text-[12px] text-ink-faint">{role}</p>
                  </div>
                  <span
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                      state === "Reading"
                        ? "bg-gold/15 text-gold"
                        : state === "Hold"
                          ? "bg-crimson/15 text-crimson"
                          : "bg-white/[0.07] text-ink-muted"
                    }`}
                  >
                    {state}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 rounded-2xl border border-line bg-surface/70 p-6">
            <p className="text-[14px] font-medium">Campus right now</p>
            <p className="mt-3 font-display text-[40px] leading-none font-semibold text-gold">133</p>
            <p className="mt-2 text-[13px] text-ink-muted">bays free of 350</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full w-[38%] rounded-full bg-gold" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
