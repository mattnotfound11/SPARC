import { Nfc } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { HomeBar, StatusBar } from "./PhoneChrome";

const history = [
  { time: "Today · 07:42", gate: "Gate 1", status: "Entered" },
  { time: "Yesterday · 18:10", gate: "Gate 2", status: "Exited" },
  { time: "Yesterday · 07:38", gate: "Gate 1", status: "Entered" },
];

/** The digital gate pass, after registration is approved. */
export function PassPhone() {
  return (
    <div className="flex h-full w-full flex-col bg-canvas text-ink">
      <StatusBar />

      <div className="flex-1 px-6 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SparcSeal size={30} />
            <div>
              <p className="text-[12px] text-ink-muted">Good morning,</p>
              <p className="font-display text-[18px] font-semibold tracking-tight">Dexter</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface/70 px-2.5 py-1.5 text-[12px] text-ink-soft">
            <span className="dot-pulse size-1.5 rounded-full bg-live" />
            Active
          </span>
        </div>

        {/* Pass card */}
        <div className="relative mt-5 overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/[0.16] via-crimson/[0.10] to-transparent p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] tracking-[0.16em] text-gold uppercase">Campus gate pass</p>
              <p className="mt-2.5 font-display text-[30px] leading-none font-semibold tracking-[0.12em]">ABC 1234</p>
              <p className="mt-2 text-[13px] text-ink-soft">Dexter M. Alvarez · Student</p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl border border-gold/35 bg-gold/15 text-gold">
              <Nfc className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <div>
              <p className="text-[11px] text-ink-faint">Zone</p>
              <p className="text-[13px] text-ink-soft">Levels 2–3</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-faint">Card</p>
              <p className="text-[13px] text-ink-soft">USA-2026-04817</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-faint">Valid</p>
              <p className="text-[13px] text-ink-soft">AY 2026–27</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[13px] text-ink-muted">Hold your card to the reader at the gate</p>

        <p className="mt-6 text-[14px] font-medium">Recent entries</p>
        <ul className="mt-3 space-y-2.5">
          {history.map(({ time, gate, status }) => (
            <li
              key={time}
              className="flex items-center justify-between rounded-2xl border border-line bg-surface/60 px-4 py-3"
            >
              <div>
                <p className="text-[14px] text-ink-soft">{gate}</p>
                <p className="text-[12px] text-ink-faint">{time}</p>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  status === "Entered" ? "bg-live/15 text-live" : "bg-white/[0.07] text-ink-muted"
                }`}
              >
                {status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <HomeBar />
    </div>
  );
}
