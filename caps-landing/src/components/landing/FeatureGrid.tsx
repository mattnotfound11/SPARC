import { CloudCheck, Nfc, Radio, ShieldCheck, type LucideIcon } from "lucide-react";

type Tone = "gold" | "crimson";

const features: { title: string; body: string; icon: LucideIcon; tone: Tone }[] = [
  {
    title: "Instant RFID Tap Access",
    body: "Sub-second gate barrier actuation triggered directly by student or faculty high-frequency RFID cards.",
    icon: Nfc,
    tone: "gold",
  },
  {
    title: "Live Bay Count & Guidance",
    body: "Real-time telemetry across multi-level decks so drivers know exactly where slots are vacant before climbing ramps.",
    icon: Radio,
    tone: "crimson",
  },
  {
    title: "Augustinian Tier Priority",
    body: "Smart zoning dynamically guarantees ground-floor access for university faculty, administrators, and registered vehicles.",
    icon: ShieldCheck,
    tone: "crimson",
  },
  {
    title: "Digital Security & Cloud Log",
    body: "Seamless cloud-synchronized entry audits without manual paper tickets, clipboard registers, or unauthorized overnight parking.",
    icon: CloudCheck,
    tone: "gold",
  },
];

const toneStyles: Record<Tone, string> = {
  gold: "border-gold/25 bg-gold/10 text-gold",
  crimson: "border-crimson/25 bg-crimson/10 text-crimson",
};

export function FeatureGrid() {
  return (
    <section id="features" aria-labelledby="features-title" className="px-4 pt-12 pb-16 sm:px-6 sm:pt-14 sm:pb-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-gold uppercase">
            Institutional Precision
          </p>
          <h2
            id="features-title"
            className="mt-3 font-display text-[clamp(1.625rem,4vw,2.25rem)] leading-tight font-bold tracking-tight text-balance text-ink"
          >
            Engineered for Frictionless Campus Transit
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
            Designed specifically to eradicate perimeter traffic queues along General Luna and protect
            parking security for Augustinians.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {features.map(({ title, body, icon: Icon, tone }) => (
            <li
              key={title}
              className="feature-card rounded-2xl border border-line bg-surface p-6 sm:p-7"
            >
              <span data-tone={tone} className={`feature-icon grid size-10 place-items-center rounded-lg border ${toneStyles[tone]}`}>
                <Icon className="size-[1.125rem]" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-[1.0625rem] font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
