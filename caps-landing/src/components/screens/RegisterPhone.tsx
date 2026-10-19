import { Car, Check, Mail, User } from "lucide-react";
import { HomeBar, StatusBar } from "./PhoneChrome";

/** Registering a vehicle from a phone. */
export function RegisterPhone() {
  return (
    <div className="flex h-full w-full flex-col bg-canvas text-ink">
      <StatusBar />

      <div className="flex-1 px-6 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-gold text-[14px] font-bold text-on-gold">S</span>
          <span className="font-display text-[17px] font-semibold tracking-tight">
            SPAR<span className="text-gold">C</span>
          </span>
        </div>

        <h2 className="display mt-7 text-[28px] leading-tight">Create your account</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          Two minutes now, then your card opens the gate.
        </p>

        <div className="mt-5 flex items-center gap-2">
          {[true, false, false].map((done, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${done ? "bg-gold" : i === 1 ? "bg-gold/40" : "bg-white/10"}`}
            />
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {[
            { icon: User, label: "Full name", value: "Dexter M. Alvarez", done: true },
            { icon: Mail, label: "University email", value: "d.alvarez@usa.edu.ph", done: true },
            { icon: Car, label: "Vehicle", value: "4-Wheel (Car/SUV)", done: false },
          ].map(({ icon: Icon, label, value, done }) => (
            <div key={label} className="rounded-2xl border border-line-strong bg-field px-4 py-3.5">
              <p className="text-[12px] text-ink-muted">{label}</p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <Icon className="size-[18px] text-ink-muted" strokeWidth={1.75} aria-hidden />
                <span className="flex-1 text-[15px]">{value}</span>
                {done && <Check className="size-4 text-live" strokeWidth={3} aria-hidden />}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-gold/60 bg-field px-4 py-3.5 shadow-[0_0_0_4px_rgba(245,179,1,0.15)]">
            <p className="text-[12px] text-ink-muted">Plate number</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[16px] tracking-[0.2em]">ABC 1234</span>
              <span className="rounded-md bg-live/15 px-2 py-0.5 text-[11px] font-semibold text-live">Available</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex h-[52px] items-center justify-center rounded-2xl bg-gold text-[16px] font-semibold text-on-gold">
          Continue
        </div>
        <p className="mt-3 text-center text-[12px] text-ink-faint">Step 2 of 3 · Vehicle details</p>
      </div>

      <HomeBar />
    </div>
  );
}
