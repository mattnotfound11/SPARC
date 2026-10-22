import { Plus } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";

const faqs = [
  {
    q: "Do I need a new card or a phone app?",
    a: "No. SPARC reads the Augustinian RFID card you already carry. There is nothing to install and nothing extra to bring to the gate.",
  },
  {
    q: "What happens if I forget my card?",
    a: "The marshal at the gate can log your entry manually against your registered plate. The record still lands in the same log, flagged as a manual entry.",
  },
  {
    q: "Can visitors still drive in?",
    a: "Yes. Visitor vehicles are logged by the marshal at the gate and routed to visitor parking, so they appear in the count and the audit trail like everyone else.",
  },
  {
    q: "How current is the slot count?",
    a: "Gate sensors report continuously, so the count you see on the portal and on campus screens reflects the last few seconds, not the last hour.",
  },
  {
    q: "Who can see my entry history?",
    a: "You can see your own history in your portal. Campus administrators can review and export records for security and planning; marshals see only what the gate needs.",
  },
];

export function FaqAccordion() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionHeader id="faq-title" eyebrow="FAQ" title="Questions drivers ask at the gate" />

        <div className="mt-14 space-y-3">
          {faqs.map(({ q, a }, i) => (
            <Reveal key={q} delay={i * 60}>
              <details className="panel faq-item px-6 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[1.0625rem] font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  {q}
                  <Plus
                    className="faq-icon size-5 shrink-0 text-ink-muted"
                    strokeWidth={2}
                    aria-hidden
                  />
                </summary>
                <div className="faq-answer-wrap">
                  <div>
                    <p className="faq-answer pb-5 text-[0.9375rem] leading-relaxed text-ink-muted">{a}</p>
                  </div>
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
