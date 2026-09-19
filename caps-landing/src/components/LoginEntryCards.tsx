"use client";

import Link from "next/link";
import { Monitor, LayoutDashboard, ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import React, { useRef, useState, MouseEvent } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

const entries = [
  {
    id: "guard-console",
    role: "Gate Personnel",
    title: "Guard Console",
    description:
      "For security staff stationed at campus gates. View live access results, monitor the current vehicle queue, and manually log visitor entries.",
    href: "/guard/login",
    accentColor: "var(--color-primary)",
    icon: Monitor,
    cta: "Open Guard Console",
  },
  {
    id: "admin-dashboard",
    role: "Administrative Staff",
    title: "Admin Dashboard",
    description:
      "For campus administrators. Review historical access logs, manage registered vehicles, configure gate rules, and export occupancy reports.",
    href: "/admin/login",
    accentColor: "var(--color-secondary)",
    icon: LayoutDashboard,
    cta: "Open Admin Dashboard",
  },
];

function SpotlightCard({
  entry,
  isVisible,
  index,
}: {
  entry: typeof entries[0];
  isVisible: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Spotlight Setup
  const [hovering, setHovering] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };
  
  const spotlightBackground = useMotionTemplate`radial-gradient(600px circle at ${mouseX}px ${mouseY}px, color-mix(in srgb, ${entry.accentColor} 12%, transparent), transparent 50%)`;

  const Icon = entry.icon;

  return (
    <div className="w-full h-full flex flex-col">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          opacity: isVisible ? 1 : 0,
          y: isVisible ? 0 : 30,
        }}
        initial={false}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
        transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="group relative flex flex-col flex-1 rounded-[2rem] bg-[#0B0A0F]/80 backdrop-blur-xl border border-white/[0.06] overflow-hidden"
      >
        {/* Dynamic Spotlight */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          animate={{ opacity: hovering ? 1 : 0 }}
          style={{ background: spotlightBackground }}
        />

        {/* Hover Border Glow */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 rounded-[2rem] transition-opacity duration-500"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${entry.accentColor} ${hovering ? "40%" : "0%"}, transparent)`,
          }}
        />

        <div className="relative z-10 flex flex-col p-8 lg:p-10 h-full flex-1">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-colors duration-500"
              style={{
                backgroundColor: `color-mix(in srgb, ${entry.accentColor} 15%, transparent)`,
                color: entry.accentColor,
                boxShadow: `0 8px 32px color-mix(in srgb, ${entry.accentColor} 20%, transparent)`,
              }}
              aria-hidden="true"
            >
              <Icon style={{ width: "var(--icon-lg)", height: "var(--icon-lg)" }} strokeWidth={2} />
            </span>
            <span
              className="text-[10px] font-bold tracking-[0.15em] px-4 py-2 rounded-full uppercase border shadow-sm backdrop-blur-md transition-colors duration-500"
              style={{
                color: entry.accentColor,
                borderColor: `color-mix(in srgb, ${entry.accentColor} 25%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${entry.accentColor} 8%, transparent)`,
              }}
            >
              {entry.role}
            </span>
          </div>

          <h3 className="mb-4 text-3xl font-extrabold tracking-tight text-[var(--color-foreground)]">
            {entry.title}
          </h3>

          <p className="mb-10 text-[15px] leading-relaxed text-[var(--color-muted-foreground)] flex-1">
            {entry.description}
          </p>

          {/* CTA button (Shimmer Button inspired) */}
          <div className="mt-auto">
            <Link
              href={entry.href}
              className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-[15px] font-bold overflow-hidden group/btn transition-colors duration-300 active:scale-[0.98]"
              style={{
                backgroundColor: entry.accentColor,
                color: entry.id === "admin-dashboard" ? "var(--color-on-admin)" : "var(--color-on-accent)",
                boxShadow: `0 12px 30px -10px ${entry.accentColor}`,
              }}
              aria-label={`Sign in to the ${entry.title}`}
            >
              {/* Shimmer sweep on hover */}
              <div className="absolute inset-0 -translate-x-[110%] group-hover/btn:translate-x-[110%] transition-transform duration-[1.5s] ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />

              <span className="relative z-10 flex items-center gap-2 drop-shadow-md">
                {entry.cta}
                <ArrowRight
                  style={{ width: "var(--icon-sm)", height: "var(--icon-sm)" }}
                  strokeWidth={3}
                  aria-hidden="true"
                  className="transition-transform group-hover/btn:translate-x-1.5"
                />
              </span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function LoginEntryCards() {
  const { ref, isVisible } = useScrollReveal(0.15);

  return (
    <section
      id="login"
      aria-labelledby="login-heading"
      className="relative py-[var(--spacing-section)] overflow-hidden"
    >
      {/* Background treatment */}
      <div className="absolute inset-0 bg-[var(--color-background)] z-0" />
      <div className="section-divider absolute top-0 left-0 right-0 z-10" />

      <div ref={ref} className="relative mx-auto max-w-6xl px-[var(--spacing-gutter)] z-10">
        {/* Section heading */}
        <div
          className="mb-16 max-w-2xl text-center mx-auto"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-primary)] drop-shadow-[0_0_8px_rgba(204,27,43,0.3)]">
            Authentication
          </span>
          <h2
            id="login-heading"
            className="mt-4 text-4xl font-black tracking-tight text-[var(--color-foreground)] sm:text-5xl"
          >
            Access Portals
          </h2>
          <p className="mt-5 text-lg font-medium text-[var(--color-muted-foreground)]">
            Select your authorization level to continue.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:max-w-4xl mx-auto">
          {entries.map((entry, index) => (
            <SpotlightCard
              key={entry.id}
              entry={entry}
              isVisible={isVisible}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
