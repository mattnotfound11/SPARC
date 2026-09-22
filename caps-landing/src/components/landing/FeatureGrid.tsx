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
    <section id="features" aria-labelledby="features-title" className="px-4 pt-[clamp(4rem,9vh,6rem)] pb-[clamp(3rem,7vh,5rem)] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold tracking-[0.16em] text-gold uppercase sm:text-[0.8125rem]">
            Institutional Precision
          </p>
          <h2
            id="features-title"
            className="mt-4 font-display text-[clamp(1.875rem,3.6vw,3rem)] leading-tight font-bold tracking-tight text-balance text-ink"
          >
            Engineered for Frictionless Campus Transit
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[clamp(1rem,1.2vw,1.1875rem)] leading-relaxed text-ink-muted">
            Designed specifically to eradicate perimeter traffic queues along General Luna and protect
            parking security for Augustinians.
          </p>
        </div>

        <ul className="mt-[clamp(2.5rem,5vh,3.5rem)] grid gap-5 sm:grid-cols-2 lg:gap-6">
          {features.map(({ title, body, icon: Icon, tone }) => (
            <li key={title} className="feature-card rounded-2xl border border-line bg-surface p-7 lg:p-9">
              <span data-tone={tone} className={`feature-icon grid size-12 place-items-center rounded-xl border ${toneStyles[tone]}`}>
                <Icon className="size-[1.375rem]" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold text-ink lg:text-[1.375rem]">{title}</h3>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-muted lg:text-base">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
