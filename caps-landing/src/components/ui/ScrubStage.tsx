"use client";

import { useEffect, useRef } from "react";

/**
 * Pinned track whose scroll progress drives `--p` (0 → 1) on itself.
 *
 * The reference springs toward the scroll position rather than locking to it,
 * so the devices lag a touch and settle. A critically damped spring on rAF
 * reproduces that, writes only a custom property, and works in every browser
 * (CSS scroll-timelines cannot spring, and Safari lacks them).
 */
export function ScrubStage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const track = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;

    const reduced =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.style.setProperty("--p", "1");
      return;
    }

    let current = 0;
    let velocity = 0;
    let target = 0;
    let raf = 0;
    let running = false;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Distance the box stays pinned for: track height minus one viewport.
      const pinned = el.offsetHeight - window.innerHeight;
      // Finish a little before the release, as the reference does.
      const span = pinned > 0 ? pinned * 0.9 : 1;
      target = Math.min(1, Math.max(0, -rect.top / span));
    };

    const write = (value: number) => el.style.setProperty("--p", value.toFixed(4));

    const tick = () => {
      const stiffness = 120;
      const damping = 26;
      const dt = 1 / 60;
      velocity += ((target - current) * stiffness - velocity * damping) * dt;
      current += velocity * dt;

      if (Math.abs(target - current) < 0.0004 && Math.abs(velocity) < 0.002) {
        current = target;
        velocity = 0;
        running = false;
      }
      write(current);
      if (running) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      measure();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    // Start wherever the page already is, so a mid-section load looks right.
    measure();
    current = target;
    write(current);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      running = false;
    };
  }, []);

  return (
    <section
      ref={track}
      aria-labelledby="cta-title"
      className={`pin-track ${className}`}
    >
      <div className="pin-sticky">{children}</div>
    </section>
  );
}
