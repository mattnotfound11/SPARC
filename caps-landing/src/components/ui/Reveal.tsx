"use client";

import { useReveal } from "@/hooks/useReveal";

type RevealProps = {
  children: React.ReactNode;
  /** Stagger in ms. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
};

/** Fades + lifts its children into view once, the first time they are seen. */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: RevealProps) {
  const { ref, shown } = useReveal<HTMLElement>();

  return (
    <Tag
      // @ts-expect-error — one ref type across the small set of allowed tags
      ref={ref}
      className={`reveal ${shown ? "in" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
