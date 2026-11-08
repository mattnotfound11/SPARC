"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const NO_PREFERENCE = "(prefers-reduced-motion: no-preference)";

function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Page entrance: every `[data-enter]` inside `scope` rises in with a short stagger.
 * Re-runs when `deps` change (for example a route or a selected day).
 */
export function useEnter(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(NO_PREFERENCE, () => {
        gsap.from("[data-enter]", {
          opacity: 0,
          y: 14,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.07,
          clearProps: "opacity,transform",
        });
      });
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );
}

/**
 * Tweens a number to `value` and writes it straight into the element, so a live
 * count that changes every few seconds costs no re-render.
 */
export function useCountTo<T extends HTMLElement = HTMLSpanElement>(value: number, duration = 0.9) {
  const ref = useRef<T>(null);
  const shown = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      shown.current = value;
      el.textContent = String(value);
      return;
    }
    const proxy = { v: shown.current };
    const tween = gsap.to(proxy, {
      v: value,
      duration,
      ease: "power3.out",
      onUpdate: () => {
        shown.current = proxy.v;
        el.textContent = String(Math.round(proxy.v));
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, duration]);

  return ref;
}
