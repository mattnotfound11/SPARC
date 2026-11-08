"use client";

import { useEffect, useRef, useState } from "react";

type RevealOptions = {
  rootMargin?: string;
  threshold?: number;
};

/**
 * Fires once, the first time the element scrolls into view.
 * Same observer the landing page's <Reveal> uses: pair `ref` with the `reveal`
 * class and toggle `in` when `shown` is true.
 */
export function useReveal<T extends HTMLElement = HTMLElement>({
  rootMargin = "0px 0px -12% 0px",
  threshold = 0.08,
}: RevealOptions = {}) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Very old browser: just show it, no state round-trip needed.
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, threshold]);

  return { ref, shown };
}
