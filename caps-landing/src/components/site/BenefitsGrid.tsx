import { BarChart3, Clock, FileCheck2, ShieldCheck, Users, Zap } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/ui/Spotlight";
import { SectionHeader } from "@/components/ui/SectionHeader";

const benefits = [
  {
    icon: Zap,
    title: "No more gate queues",
    body: "Sub-second reads keep the perimeter moving at 7:30am instead of backing traffic onto General Luna.",
  },
  {
    icon: Clock,
    title: "Minutes back per trip",
    body: "Drivers stop circling decks that are already full — the count tells them where to go before the ramp.",
  },
  {
    icon: ShieldCheck,
    title: "Only registered vehicles",
    body: "Unknown plates are held for a marshal, so the campus knows exactly what is parked inside it.",
  },
  {
    icon: FileCheck2,
    title: "Audit-ready records",
    body: "Every entry and exit is time-stamped and exportable, replacing clipboards and paper slips.",
  },
  {
    icon: Users,
    title: "Fair zoning by role",
    body: "Faculty, students and service vehicles each get the zone policy intends, enforced automatically.",
  },
  {
    icon: BarChart3,
    title: "Occupancy you can plan with",
    body: "Historical counts show peak hours and deck demand, so parking decisions use data, not guesswork.",
  },
];

export function BenefitsGrid() {
  return (
    <section id="benefits" aria-labelledby="benefits-title" className="px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="benefits-title"
          eyebrow="Benefits"
          title="What the campus gets back"
          body="The gate is the bottleneck. Fixing it returns time to drivers, control to marshals and evidence to administrators."
        />

        <ul className="mt-16 grid gap-5 sm:mt-20 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, body }, i) => (
            <Reveal as="li" key={title} delay={(i % 3) * 90}>
              <Spotlight className="panel panel-lit group h-full p-7 transition-colors duration-300 hover:border-gold/35">
                <span className="grid size-11 place-items-center rounded-xl border border-line bg-white/[0.04] text-gold transition-colors duration-300 group-hover:border-gold/40 group-hover:bg-gold/10">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="display mt-6 text-lg text-ink">{title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">{body}</p>
              </Spotlight>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
