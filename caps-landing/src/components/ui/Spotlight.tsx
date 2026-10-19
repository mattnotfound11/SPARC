"use client";

import { useRef } from "react";

/**
 * Tracks the cursor inside its box and exposes it as --mx/--my so the
 * `.spot` gradient can follow. Pointer-move only; no scroll or resize work.
 */
export function Spotlight({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLElement>(null);

  function handleMove(event: React.PointerEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <Tag
      // @ts-expect-error — one ref type across the small set of allowed tags
      ref={ref}
      onPointerMove={handleMove}
      className={`spot ${className}`}
    >
      {children}
    </Tag>
  );
}
