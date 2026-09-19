"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wifi, CreditCard, Server, Monitor,
  ClipboardList, AlertTriangle, Clock, UserCheck,
  ShieldCheck, BarChart3, Zap, Eye,
} from "lucide-react";

// ── Before / After data ──────────────────────────────────────────────────────

const beforeItems = [
  { icon: ClipboardList, label: "Paper logbook", sub: "Manual entry, error-prone" },
  { icon: AlertTriangle, label: "No access control", sub: "Anyone can tailgate" },
  { icon: Clock, label: "Long queues", sub: "Guard checks each plate manually" },
  { icon: UserCheck, label: "No real-time data", sub: "Slot count unknown until guard walks lot" },
];

const afterItems = [
  { icon: CreditCard, label: "RFID / QR tap", sub: "Instant verification < 1s" },
  { icon: ShieldCheck, label: "Automated gate control", sub: "Allow / Deny in real time" },
  { icon: Zap, label: "Zero queue friction", sub: "Barrier opens automatically" },
  { icon: BarChart3, label: "Live dashboard", sub: "Occupancy & logs updated instantly" },
];

// ── Compare Slider component ─────────────────────────────────────────────────

function CompareSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dividerPos, setDividerPos] = useState(50);
  const isDragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setDividerPos((x / rect.width) * 100);
  }, []);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp   = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) updatePos(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    updatePos(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[380px] rounded-2xl overflow-hidden border border-white/[0.07] cursor-col-resize select-none touch-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      aria-label="Drag to compare manual vs SPARC process"
    >
      {/* ── SPARC side (right / base layer) ───────────────────── */}
      <div className="absolute inset-0 bg-[#0F0F11] flex flex-col justify-between p-7">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[var(--color-success)]">
            With SPARC
          </span>
        </div>
        <div className="flex flex-col gap-4">
          {afterItems.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-secondary-subtle)] text-[var(--color-secondary)]">
                <Icon style={{ width: 16, height: 16 }} strokeWidth={1.5} />
              </span>
              <div>
                <div className="text-sm font-semibold text-[var(--color-foreground)]">{label}</div>
                <div className="text-[11px] text-[var(--color-muted-foreground)]">{sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-secondary)]">
            Automated · Real-time · Secure
          </span>
          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded bg-[var(--color-secondary-subtle)] border border-[var(--color-secondary)]/20 text-[var(--color-secondary)]">
            After
          </span>
        </div>
      </div>

      {/* ── Manual side (left / overlay, clips based on divider) ─── */}
      <div
        className="absolute inset-0 flex flex-col justify-between p-7 overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - dividerPos}% 0 0)`,
          background: 'linear-gradient(135deg, #151212 0%, #0F0F11 100%)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400/60" />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-red-400/80">
            Manual Process
          </span>
        </div>
        <div className="flex flex-col gap-4">
          {beforeItems.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400/70">
                <Icon style={{ width: 16, height: 16 }} strokeWidth={1.5} />
              </span>
              <div>
                <div className="text-sm font-semibold text-[var(--color-foreground)]">{label}</div>
                <div className="text-[11px] text-[var(--color-muted-foreground)]">{sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-red-400/60">
            Slow · Error-prone · No visibility
          </span>
          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400/70">
            Before
          </span>
        </div>
      </div>

      {/* ── Draggable divider handle ─────────────────────────────── */}
      <div
        className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
        style={{ left: `${dividerPos}%`, transform: 'translateX(-50%)' }}
      >
        {/* Vertical line */}
        <div className="w-px h-full bg-white/20" />
        {/* Handle circle */}
        <div className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/25 backdrop-blur-sm shadow-lg">
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5h12M1 5L4 2M1 5L4 8M13 5L10 2M13 5L10 8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────

export function OverviewSection() {
  const { ref, isVisible } = useScrollReveal(0.2);

  return (
    <section id="overview" className="relative w-full py-[var(--spacing-section)]">
      <div
        ref={ref}
        className="mx-auto max-w-6xl px-[var(--spacing-gutter)]"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text column */}
          <div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-primary)]">
              The Challenge
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-[var(--color-foreground)] md:text-4xl lg:text-[2.5rem] leading-tight tracking-tight">
              Elevate Campus Parking.{" "}
              <span className="text-gradient-red-gold">Streamline Access.</span>
            </h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--color-muted-foreground)] md:text-[15px]">
              <p>
                With the rapid growth of vehicle ownership, managing campus parking and vehicle flow has become a persistent operational challenge at the{" "}
                <strong className="text-[var(--color-foreground)] font-semibold">University of San Agustin</strong>.
              </p>
              <p>
                SPARC tackles this by offering an integrated,{" "}
                <span className="text-[var(--color-secondary)] font-medium">IoT-based smart parking solution</span>{" "}
                that combines per-slot occupancy sensors with automated RFID and QR-code vehicle identification.
              </p>
              <p>
                Drag the slider to see exactly what SPARC replaces.
              </p>
            </div>
          </div>

          {/* Compare Slider column */}
          <div className="relative">
            <CompareSlider />
            {/* Background glow */}
            <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-[var(--color-primary)]/5 blur-[80px] -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
