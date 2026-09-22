import { Info } from "lucide-react";

/** Inline status shown after submit while the auth service is not wired up. */
export function FormNotice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-gold/25 bg-gold/[0.07] px-3.5 py-3 text-[0.8125rem] leading-relaxed text-ink-soft"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}
