"use client";

import type { RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Entrance motion for an auth form: every `[data-anim]` element rises in with a
 * short stagger and the active tab's underline draws across. Skipped entirely
 * for people who prefer reduced motion.
 */
export function useAuthMotion(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-anim]", {
          opacity: 0,
          y: 12,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.045,
          clearProps: "opacity,transform",
        });
        gsap.from("[data-tab-line]", {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 0.5,
          delay: 0.12,
          ease: "power3.out",
        });
      });
    },
    { scope },
  );
}
