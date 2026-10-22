import { Reveal } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/ui/Spotlight";
import { Pill } from "@/components/ui/Pill";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GateTapDemo } from "@/components/demos/GateTapDemo";
import { BayCountDemo } from "@/components/demos/BayCountDemo";
import { TierPriorityDemo } from "@/components/demos/TierPriorityDemo";
import { AuditLogDemo } from "@/components/demos/AuditLogDemo";

const rows = [
  {
    label: "Gate access",
    title: "Tap once. The barrier lifts.",
    body: "High-frequency RFID reads your Augustinian card at the gate and actuates the barrier in under a second — no tickets, no window winding, no queue down General Luna.",
    chips: ["RFID cards", "Sub-second", "4 gates"],
    demo: <GateTapDemo />,
  },
  {
    label: "Live count",
    title: "Know where the slots are before you climb.",
    body: "Sensors report every deck continuously, so drivers see which level has room and marshals see the campus filling up in real time rather than after the fact.",
    chips: ["Per-deck counts", "Live updates", "Driver guidance"],
    demo: <BayCountDemo />,
  },
  {
    label: "Priority zoning",
    title: "The right vehicle in the right zone.",
    body: "Faculty, administrators, registered students and service vehicles each resolve to their own zone automatically, and unregistered plates are held at the gate for a marshal.",
    chips: ["Role-aware", "Automatic", "Marshal override"],
    demo: <TierPriorityDemo />,
  },
  {
    label: "Audit log",
    title: "Every entry on record, synced to the cloud.",
    body: "Each tap writes a plate-matched, time-stamped row that administrators can review or export — replacing clipboard registers and unauthorized overnight parking.",
    chips: ["Time-stamped", "Exportable", "Plate matched"],
    demo: <AuditLogDemo />,
  },
];

export function FeatureRows() {
  return (
    <section id="features" aria-labelledby="features-title" className="px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="features-title"
          eyebrow="What SPARC does"
          title="Four parts of one gate-to-bay system"
          body="Every piece runs on the card students and staff already carry, and reports into one dashboard the campus actually uses."
        />

        <div className="mt-20 space-y-20 sm:mt-24 sm:space-y-28">
          {rows.map(({ label, title, body, chips, demo }, i) => (
            <div
              key={title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <Reveal className={`min-w-0 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                <Pill>{label}</Pill>
                <h3 className="display mt-6 text-[clamp(1.75rem,3.4vw,2.1875rem)] text-ink">{title}</h3>
                <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted">{body}</p>
                <ul className="mt-7 flex flex-wrap gap-2.5">
                  {chips.map((chip) => (
                    <li
                      key={chip}
                      className="rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-[0.8125rem] text-ink-soft"
                    >
                      {chip}
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={120} className={`min-w-0 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                <Spotlight className="panel panel-lit demo-panel block p-3 sm:p-4">{demo}</Spotlight>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
