import { Car, Check, IdCard, Mail, User } from "lucide-react";

const steps = ["Account", "Vehicle", "Pair card"];

/** Step 2 of registration, as it looks on a laptop. */
export function RegisterScreen() {
  return (
    <div className="flex h-full w-full bg-canvas text-ink">
      {/* Left rail — why you're here */}
      <aside className="flex w-[380px] shrink-0 flex-col justify-between border-r border-line bg-surface/60 p-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-gold text-[15px] font-bold text-on-gold">S</span>
            <span className="font-display text-xl font-semibold tracking-tight">
              SPAR<span className="text-gold">C</span>
            </span>
          </div>
          <h2 className="display mt-12 text-[34px] leading-tight">Register your vehicle</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            Three short steps. After this, your Augustinian card opens the gate on its own.
          </p>

          <ol className="mt-10 space-y-4">
            {steps.map((label, i) => {
              const done = i === 0;
              const active = i === 1;
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={`grid size-7 place-items-center rounded-full text-[13px] font-semibold ${
                      done
                        ? "bg-live/20 text-live"
                        : active
                          ? "bg-gold text-on-gold"
                          : "bg-white/[0.06] text-ink-faint"
                    }`}
                  >
                    {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-[15px] ${active ? "text-ink" : "text-ink-muted"}`}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="text-[13px] text-ink-faint">Takes about two minutes · USA email required</p>
      </aside>

      {/* Form */}
      <section className="flex-1 p-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium tracking-[0.14em] text-gold uppercase">Step 2 of 3</p>
            <h3 className="display mt-2 text-[28px]">Vehicle details</h3>
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full w-2/3 rounded-full bg-gold" />
          </div>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-5">
          {[
            { label: "Full name", value: "Dexter M. Alvarez", icon: User },
            { label: "University email", value: "d.alvarez@usa.edu.ph", icon: Mail },
            { label: "Campus role", value: "Student · CAS", icon: IdCard },
            { label: "Vehicle", value: "4-Wheel (Car/SUV)", icon: Car },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label}>
              <p className="text-[13px] font-medium text-ink-soft">{label}</p>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-line-strong bg-field px-4 py-3.5">
                <Icon className="size-[18px] text-ink-muted" strokeWidth={1.75} aria-hidden />
                <span className="text-[15px]">{value}</span>
              </div>
            </div>
          ))}

          <div className="col-span-2">
            <p className="text-[13px] font-medium text-ink-soft">Plate number</p>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-gold/60 bg-field px-4 py-3.5 shadow-[0_0_0_4px_rgba(245,179,1,0.15)]">
              <span className="text-[15px] tracking-[0.18em]">ABC 1234</span>
              <span className="rounded-md bg-live/15 px-2.5 py-1 text-[12px] font-semibold text-live">
                Plate available
              </span>
            </div>
          </div>
        </div>

        <div className="mt-9 flex items-center justify-between">
          <p className="text-[13px] text-ink-faint">You can add a second vehicle later.</p>
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-line-strong px-5 py-3 text-[15px] text-ink-soft">Back</span>
            <span className="rounded-xl bg-gold px-6 py-3 text-[15px] font-semibold text-on-gold">
              Continue to card pairing
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
