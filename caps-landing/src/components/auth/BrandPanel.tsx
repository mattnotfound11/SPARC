"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SparcSeal } from "@/components/brand/SparcSeal";

gsap.registerPlugin(useGSAP);

const facts = [
  { value: "110", label: "parking slots" },
  { value: "5", label: "floors" },
  { value: "1 tap", label: "to enter" },
];

/**
 * Desktop-only left panel. It lives in the auth layout, so it animates once
 * and stays put while the form side switches between Log in and Sign up.
 */
export function BrandPanel({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-brand]", {
          opacity: 0,
          y: 14,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.08,
          clearProps: "opacity,transform",
        });
      });
    },
    { scope: root },
  );

  return (
    <aside ref={root} className="hidden flex-col border-r border-line bg-surface px-14 pt-7 pb-11 lg:sticky lg:top-0 lg:flex lg:h-svh lg:self-start">
      {children}

      <div className="my-auto">
        <div data-brand>
          <SparcSeal
            size={76}
            priority
            className="size-[4.75rem] ring-[3px] ring-[#f6eee0] shadow-[0_0_0_6px_rgba(245,179,1,0.14)]"
          />
        </div>
        <p data-brand className="mt-7 text-sm font-semibold tracking-[0.12em] text-gold uppercase">
          Official Parking &amp; Access Portal
        </p>
        <h2
          data-brand
          className="mt-3 max-w-[11em] font-display text-[clamp(2.125rem,3.2vw,3rem)] leading-[1.04] font-bold tracking-[-0.03em] text-ink"
        >
          Smart Parking Access and Real-Time Count
        </h2>
        <p data-brand className="mt-4 max-w-[24em] text-[1.0625rem] leading-relaxed text-ink-muted">
          Tap your campus ID at the gate, pick a slot, and drive in. University of San Agustin.
        </p>
      </div>

      <dl data-brand className="flex gap-10 border-t border-line pt-6">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="sr-only">{f.label}</dt>
            <dd className="font-display text-[1.625rem] leading-none font-bold tracking-[-0.02em] text-ink">{f.value}</dd>
            <p aria-hidden className="mt-1.5 text-[0.8125rem] text-ink-muted">
              {f.label}
            </p>
          </div>
        ))}
      </dl>
    </aside>
  );
}
