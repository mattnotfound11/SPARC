"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useEffect, useRef, useState } from "react";
import { CreditCard, CheckCircle2, ClipboardList, ParkingSquare } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    icon: CreditCard,
    title: "Tap Campus ID",
    description:
      "The driver holds their existing campus RFID card or scans a registered QR code at the gate reader.",
    color: "var(--color-primary)",
  },
  {
    step: "02",
    icon: CheckCircle2,
    title: "Instant Validation",
    description:
      "SPARC checks the card against the registered vehicle database and returns a decision in under one second.",
    color: "var(--color-secondary)",
  },
  {
    step: "03",
    icon: ClipboardList,
    title: "Guard Sees Result",
    description:
      'The Guard Console displays "Allow" or "Deny" clearly. Gate personnel operate the barrier based on that result.',
    color: "var(--color-primary)",
  },
  {
    step: "04",
    icon: ParkingSquare,
    title: "Entry Logged",
    description:
      "The access event is recorded and the slot count adjusts immediately — one fewer on entry, one restored on exit.",
    color: "var(--color-secondary)",
  },
];

/** Animated beam with a traveling glowing dot connecting the step cards */
function ConnectorPath({ isVisible }: { isVisible: boolean }) {
  return (
    <div className="absolute top-10 left-0 right-0 hidden lg:block pointer-events-none z-0 px-8 lg:px-12">
      <svg
        className="w-full overflow-visible"
        height="20"
        viewBox="0 0 900 20"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(204,27,43,0.6)" />
            <stop offset="33%" stopColor="rgba(212,175,55,0.6)" />
            <stop offset="66%" stopColor="rgba(204,27,43,0.6)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.6)" />
          </linearGradient>
          {/* Glow filter for the traveling dot */}
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static dashed background line */}
        <line
          x1="0" y1="10" x2="900" y2="10"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
          strokeDasharray="6 4"
        />

        {/* Animated fill line */}
        <motion.line
          x1="0" y1="10" x2="900" y2="10"
          stroke="url(#pathGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isVisible ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut", delay: 0.4 }}
        />

        {/* Traveling glowing dot */}
        {isVisible && (
          <motion.circle
            cy="10"
            r="5"
            fill="rgba(212,175,55,0.95)"
            filter="url(#dotGlow)"
            initial={{ cx: 0, opacity: 0 }}
            animate={{
              cx: [0, 300, 600, 900],
              opacity: [0, 1, 1, 1, 0],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              repeatDelay: 0.8,
              ease: "easeInOut",
              delay: 1.0,
            }}
          />
        )}

        {/* Arrow heads at step junctions */}
        {[300, 600].map((x) => (
          <motion.polygon
            key={x}
            points={`${x - 5},6 ${x + 3},10 ${x - 5},14`}
            fill="rgba(212,175,55,0.5)"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.9 }}
          />
        ))}
      </svg>
    </div>
  );
}

export function HowItWorksSection() {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="mx-auto max-w-[1400px] px-8 lg:px-12 py-[var(--spacing-section)] relative"
    >
      {/* Heading */}
      <div
        ref={ref}
        className="mb-16 max-w-2xl"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-secondary)]">
          Process
        </span>
        <h2
          id="how-it-works-heading"
          className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
        >
          How it works
        </h2>
        <p className="mt-4 text-lg text-[var(--color-muted-foreground)]">
          From card tap to logged record — four simple steps.
        </p>
      </div>

      {/* Steps + Connector */}
      <div className="relative">
        <ConnectorPath isVisible={isVisible} />

        <ol
          className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 z-10"
          aria-label="SPARC tap-to-verify flow"
        >
          {steps.map(({ step, icon: Icon, title, description, color }, index) => (
            <motion.li
              key={step}
              className="relative flex flex-col group"
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: (index + 1) * 0.15 }}
            >
              {/* Step card */}
              <div
                className="p-8 h-full rounded-[2rem] flex flex-col bg-black/40 border border-white/[0.04] transition-all duration-500 group-hover:border-white/[0.15] group-hover:bg-white/[0.03] group-hover:shadow-2xl group-hover:shadow-black/40"
              >
                {/* Top: step number + icon */}
                <div className="mb-6 flex items-center justify-between">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-black/50 transition-all duration-500 group-hover:scale-110"
                    aria-hidden="true"
                    style={{ boxShadow: `0 0 0 0 transparent` }}
                  >
                    <Icon
                      style={{ width: "24px", height: "24px", color }}
                      className="transition-colors duration-500"
                      strokeWidth={1.5}
                    />
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-xs font-bold tracking-[0.15em]"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {step}
                    </span>
                    {/* Mini animated progress pip */}
                    <motion.div
                      className="h-1 w-8 rounded-full"
                      style={{ background: color }}
                      animate={{ scaleX: [0.4, 1, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.4 }}
                    />
                  </div>
                </div>

                <h3 className="mb-3 text-xl font-bold text-[var(--color-foreground)] tracking-tight">
                  {title}
                </h3>

                <p className="text-[15px] leading-relaxed text-[#8B8B8B] transition-colors duration-500 group-hover:text-white/90 flex-1">
                  {description}
                </p>

                {/* Bottom accent line that grows on hover */}
                <div className="mt-6 h-[1px] w-0 group-hover:w-full transition-all duration-500 rounded-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
              </div>
            </motion.li>
          ))}
        </ol>
      </div>

      {/* Scope note */}
      <motion.div
        className="mt-16 glass-card px-8 py-5 text-sm text-[var(--color-muted-foreground)] border-l-2"
        style={{ borderLeftColor: "var(--color-primary)" }}
        role="note"
        aria-label="Scope note"
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <strong className="text-[var(--color-foreground)] font-semibold">Note:</strong>{" "}
        SPARC is an access and occupancy telemetry system only. It does not handle
        fees, tolls, or any form of payment or billing.
      </motion.div>
    </section>
  );
}
