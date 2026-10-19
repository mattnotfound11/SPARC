import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";

const steps = [
  {
    n: "01",
    title: "Register",
    body: "Create your SPARC account with your USA email, then add your plate and vehicle type to pair them with your ID.",
  },
  {
    n: "02",
    title: "Pair your card",
    body: "Your Augustinian RFID card becomes your gate key. Nothing to install, nothing extra to carry.",
  },
  {
    n: "03",
    title: "Tap at the gate",
    body: "Hold the card to the reader. SPARC checks your record and lifts the barrier in well under a second.",
  },
  {
    n: "04",
    title: "Park by the live count",
    body: "Screens and the portal show which deck has room, while your entry is written to the campus log.",
  },
];

export function ProcessSteps() {
  return (
    <section id="how-it-works" aria-labelledby="process-title" className="px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="process-title"
          eyebrow="How it works"
          title="From the registry desk to the gate in four steps"
          body="Set up once at the start of term. After that it is one tap per entry, every day."
        />

        <ol className="mt-16 grid gap-5 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ n, title, body }, i) => (
            <Reveal as="li" key={n} delay={i * 90}>
              <div className="panel panel-lit h-full p-7">
                <span className="font-mono text-sm text-gold">{n}</span>
                <h3 className="display mt-5 text-xl text-ink">{title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
