"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Home } from "lucide-react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it Works" },
  { id: "login", label: "Access Portals" },
];

export function SubNav() {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="sticky top-0 z-40 w-full border-y border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-xl shadow-lg shadow-black/10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col justify-center px-8 lg:px-12 py-4 gap-4">
        {/* Top Row: Title & Breadcrumbs */}
        <div className="flex w-full items-center justify-between">
          <h2 className="text-xl font-medium text-[var(--color-foreground)] tracking-tight">
            SPARC Parking Management
          </h2>

          {/* Breadcrumbs */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)] font-medium">
            <Home className="h-3.5 w-3.5 hover:text-[var(--color-foreground)] cursor-pointer transition-colors" />
            <ChevronRight className="h-3 w-3" />
            <span className="hover:text-[var(--color-foreground)] cursor-pointer transition-colors">Portals</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[var(--color-foreground)]">SPARC</span>
          </div>
        </div>

        {/* Bottom Row: Section nav links with active glow */}
        <nav
          className="flex items-center gap-8 lg:gap-12 text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-hide"
          aria-label="Page sections"
        >
          {SECTIONS.map(({ id, label }) => {
            const isActive = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                className="relative flex flex-col items-center gap-1 transition-colors duration-300 pb-0.5"
                style={{
                  color: isActive
                    ? "var(--color-foreground)"
                    : "var(--color-muted-foreground)",
                }}
                aria-current={isActive ? "location" : undefined}
              >
                {label}

                {/* Glowing underline */}
                <span
                  className="absolute -bottom-[17px] left-0 right-0 h-[2px] rounded-full transition-all duration-400"
                  style={{
                    background: isActive
                      ? "linear-gradient(90deg, var(--color-primary), var(--color-secondary))"
                      : "transparent",
                    boxShadow: isActive
                      ? "0 0 8px var(--color-primary), 0 0 16px rgba(204,27,43,0.3)"
                      : "none",
                    opacity: isActive ? 1 : 0,
                  }}
                />
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
