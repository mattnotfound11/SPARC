"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useTelemetry } from "@/components/TelemetryProvider";

// ── Inline SVG mini-illustrations per feature ──────────────────────────────

function RfidIllustration() {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [scanned, setScanned] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDrag = useCallback((_: unknown, info: { point: { x: number; y: number } }) => {
    if (!constraintsRef.current) return;
    const rect = constraintsRef.current.getBoundingClientRect();
    // Scanner zone is the right ~30% of the container
    const scannerZoneX = rect.left + rect.width * 0.6;
    if (info.point.x > scannerZoneX && !scanned) {
      setScanned(true);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(() => setScanned(false), 2500);
    }
  }, [scanned]);

  return (
    <div ref={constraintsRef} className="relative w-full h-full flex items-center justify-center select-none">
      {/* Scanner zone (right side) */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
        {/* Scanner device */}
        <div className={`relative w-28 h-36 rounded-2xl border-[3px] transition-all duration-500 flex flex-col items-center justify-center gap-2 ${
          scanned 
            ? 'border-green-500/60 bg-green-500/10 shadow-[0_0_40px_rgba(34,197,94,0.3)]' 
            : 'border-white/10 bg-white/[0.03]'
        }`}>
          {/* Scanner screen */}
          <div className={`w-14 h-8 rounded-md transition-colors duration-300 ${
            scanned ? 'bg-green-500/20' : 'bg-white/[0.04]'
          }`} />
          {/* Scan line animation */}
          {!scanned && (
            <motion.div
              className="absolute left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-secondary)]/50 to-transparent"
              animate={{ top: ['30%', '70%', '30%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {/* NFC icon */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className={`transition-colors duration-300 ${scanned ? 'text-green-500/70' : 'text-white/20'}`}>
            <path d="M6 8.5c2-3 6-3 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 5.5c3.5-5 10.5-5 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.5" />
          </svg>
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/30 mt-1">TAP</span>
        </div>
      </div>

      {/* Drag hint */}
      {!scanned && !isDragging && (
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-white/40 flex items-center gap-2">
            <motion.span animate={{ x: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
            Drag card to scanner
          </span>
        </motion.div>
      )}

      {/* Draggable RFID Card */}
      <motion.div
        className="relative cursor-grab active:cursor-grabbing z-10"
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragSnapToOrigin={!scanned}
        onDrag={handleDrag}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        whileDrag={{ scale: 1.05 }}
        whileHover={{ scale: 1.02 }}
        style={{ touchAction: 'none' }}
      >
        <div className={`relative w-[220px] h-[140px] rounded-xl border-2 transition-all duration-300 overflow-hidden ${
          isDragging 
            ? 'border-[var(--color-secondary)]/50 shadow-2xl shadow-[var(--color-secondary)]/20' 
            : 'border-[var(--color-primary)]/30 shadow-xl'
        }`} style={{ background: 'linear-gradient(135deg, rgba(204,27,43,0.18), rgba(204,27,43,0.1))' }}>
          {/* Card chip */}
          <div className="absolute left-5 top-5 w-12 h-9 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/20 flex items-center justify-center">
            <div className="w-[1px] h-full bg-[var(--color-primary)]/30" />
            <div className="w-[1px] h-full bg-[var(--color-primary)]/30 ml-2" />
          </div>
          {/* Magnetic strip */}
          <div className="absolute left-0 right-0 top-[52%] h-[12px] bg-[var(--color-primary)]/15" />
          {/* Card label */}
          <span className="absolute bottom-3 right-4 text-[10px] font-bold tracking-widest text-white/20 uppercase">SPARC ID</span>
          {/* NFC symbol on card */}
          <svg className="absolute right-4 top-4" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 10c2-2 6-2 8 0" stroke="rgba(212,175,55,0.5)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M4 7c3.5-4 10.5-4 14 0" stroke="rgba(212,175,55,0.3)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="12" cy="13" r="2.5" fill="rgba(212,175,55,0.5)" />
          </svg>
        </div>
      </motion.div>

      {/* ACCESS GRANTED overlay */}
      <AnimatePresence>
        {scanned && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-green-500/10 border-2 border-green-500/30 backdrop-blur-md shadow-2xl shadow-green-500/20"
              initial={{ scale: 0.8, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="rgba(34,197,94,0.2)" stroke="rgba(34,197,94,0.6)" strokeWidth="2" />
                <motion.path 
                  d="M8 12l3 3 5-5" 
                  stroke="rgba(34,197,94,0.9)" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                />
              </svg>
              <span className="text-base font-bold tracking-widest uppercase text-green-400">Access Granted</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityIllustration() {
  // Total cycle: 6s active + 2s pause = 8s
  const cycleDuration = 6;
  const pause = 2;
  const total = cycleDuration + pause;

  return (
    <svg viewBox="0 0 200 120" fill="none" className="w-full h-full" aria-hidden="true">
      <defs>
        {/* Headlight glow */}
        <radialGradient id="headlight-glow" cx="0.9" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="rgba(255,240,180,0.4)" />
          <stop offset="100%" stopColor="rgba(255,240,180,0)" />
        </radialGradient>
        {/* Road surface gradient */}
        <linearGradient id="road-surface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
        </linearGradient>
        {/* Lamp light cone */}
        <radialGradient id="lamp-cone" cx="0.5" cy="0" r="1">
          <stop offset="0%" stopColor="rgba(255,220,130,0.08)" />
          <stop offset="60%" stopColor="rgba(255,220,130,0.02)" />
          <stop offset="100%" stopColor="rgba(255,220,130,0)" />
        </radialGradient>
      </defs>

      {/* ── Sky / ambient ──────────────────────────── */}

      {/* ── Ground & Road ─────────────────────────── */}
      <rect x="0" y="88" width="200" height="32" fill="url(#road-surface)" />
      <line x1="0" y1="88" x2="200" y2="88" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
      {/* Lane dashes */}
      {[10, 35, 60, 85, 130, 155, 180].map((dx) => (
        <rect key={dx} x={dx} y="97" width="14" height="1.5" rx="0.75" fill="rgba(255,255,255,0.06)" />
      ))}
      {/* Curb / sidewalk edge */}
      <rect x="0" y="86" width="200" height="2" fill="rgba(255,255,255,0.03)" />

      {/* ── Guard booth ───────────────────────────── */}
      <rect x="100" y="48" width="22" height="40" rx="2" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
      {/* Booth window */}
      <rect x="103" y="52" width="16" height="10" rx="1.5" fill="rgba(100,180,255,0.06)" stroke="rgba(100,180,255,0.12)" strokeWidth="0.5" />
      {/* Booth roof */}
      <rect x="97" y="45" width="28" height="5" rx="1.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
      {/* Booth door */}
      <rect x="108" y="68" width="8" height="20" rx="1" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

      {/* ── Overhead lamp ─────────────────────────── */}
      {/* Lamp pole */}
      <rect x="96" y="20" width="2" height="28" fill="rgba(255,255,255,0.08)" />
      {/* Lamp arm */}
      <rect x="82" y="19" width="16" height="2" rx="1" fill="rgba(255,255,255,0.08)" />
      {/* Lamp fixture */}
      <rect x="80" y="17" width="6" height="5" rx="1" fill="rgba(255,220,130,0.15)" stroke="rgba(255,220,130,0.25)" strokeWidth="0.5" />
      {/* Lamp light cone */}
      <ellipse cx="83" cy="50" rx="18" ry="35" fill="url(#lamp-cone)" />

      {/* ── RFID reader pedestal ──────────────────── */}
      {/* Pedestal pole */}
      <rect x="88" y="65" width="4" height="23" rx="1" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
      {/* Reader head */}
      <rect x="85" y="60" width="10" height="7" rx="2" fill="rgba(212,175,55,0.12)" stroke="rgba(212,175,55,0.3)" strokeWidth="0.8" />
      {/* Screen on reader */}
      <rect x="87" y="62" width="6" height="3" rx="0.5" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.2)" strokeWidth="0.4" />

      {/* ── Gate barrier ──────────────────────────── */}
      {/* Gate post */}
      <rect x="93" y="68" width="5" height="22" rx="1" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
      {/* Post cap with light */}
      <rect x="91.5" y="65" width="8" height="4" rx="1.5" fill="rgba(204,27,43,0.2)" stroke="rgba(204,27,43,0.4)" strokeWidth="0.7" />

      {/* Gate status light — red while closed, green while open */}
      <motion.circle cx="95.5" cy="67" r="1.2"
        animate={{ fill: [
          "rgba(204,27,43,0.8)",  /* 0%   idle red */
          "rgba(204,27,43,0.8)",  /* 35%  still red */
          "rgba(34,197,94,0.9)",  /* 40%  turns green */
          "rgba(34,197,94,0.9)",  /* 70%  still green */
          "rgba(204,27,43,0.8)",  /* 78%  back red */
          "rgba(204,27,43,0.8)",  /* 100% */
        ] }}
        transition={{ duration: total, repeat: Infinity, times: [0, 0.35, 0.40, 0.70, 0.78, 1] }}
      />

      {/*
        Timeline (% of 8s cycle):
         0-20%  car approaches, stops at x=30 (front bumper at x=82)
        20-30%  car idle, RFID scan waves appear
        30-38%  ACCESS GRANTED shows
        38-48%  gate arm lifts (barrier opens)
        48-70%  car drives through
        70-80%  gate arm closes
        80-100% pause / reset
      */}

      {/* Barrier arm — pivots at the top of the post */}
      <motion.g
        style={{ transformOrigin: "95.5px 69px" }}
        animate={{ rotate: [0, 0, 0, -85, -85, 0, 0] }}
        transition={{ duration: total, repeat: Infinity, times: [0, 0.36, 0.40, 0.48, 0.70, 0.80, 1], ease: "easeInOut" }}
      >
        {/* Main arm */}
        <rect x="95" y="67.5" width="55" height="3" rx="1.5" fill="rgba(204,27,43,0.45)" stroke="rgba(204,27,43,0.65)" strokeWidth="0.7" />
        {/* Red-white chevron stripes */}
        {[105, 115, 125, 135, 143].map((sx, i) => (
          <rect key={sx} x={sx} y="68" width="5" height="2" rx="0.5" fill={i % 2 === 0 ? "rgba(255,255,255,0.18)" : "rgba(204,27,43,0.25)"} />
        ))}
        {/* End reflector */}
        <circle cx="149" cy="69" r="1.5" fill="rgba(255,60,60,0.4)" />
      </motion.g>

      {/* ── RFID scan waves — appear while car is stopped ── */}
      <motion.g
        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
        transition={{ duration: total, repeat: Infinity, times: [0, 0.20, 0.24, 0.35, 0.38, 1] }}
      >
        <motion.path d="M84 61 Q80 63.5 84 66" stroke="rgba(34,197,94,0.6)" strokeWidth="1" fill="none" strokeLinecap="round"
          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, repeat: Infinity }} />
        <motion.path d="M82 59 Q76 63.5 82 68" stroke="rgba(34,197,94,0.4)" strokeWidth="0.8" fill="none" strokeLinecap="round"
          animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
        <motion.path d="M80 57 Q72 63.5 80 70" stroke="rgba(34,197,94,0.25)" strokeWidth="0.8" fill="none" strokeLinecap="round"
          animate={{ opacity: [0.1, 0.6, 0.1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
      </motion.g>

      {/* ── Car ───────────────────────────────────── */}
      {/* Car stops at x=30 → front bumper (x=52) lands at x=82, just before reader at x=85 */}
      <motion.g
        animate={{ x: [-80, 30, 30, 30, 160] }}
        transition={{ duration: total, repeat: Infinity, times: [0, 0.20, 0.22, 0.50, 0.75], ease: "easeInOut" }}
      >
        {/* Shadow under car */}
        <ellipse cx="28" cy="89" rx="22" ry="2" fill="rgba(0,0,0,0.15)" />
        {/* Car body lower */}
        <path d="M6 78 Q6 74 10 74 L46 74 Q50 74 50 78 L50 86 Q50 88 48 88 L8 88 Q6 88 6 86 Z"
          fill="rgba(212,175,55,0.18)" stroke="rgba(212,175,55,0.35)" strokeWidth="0.8" />
        {/* Car body upper / cabin */}
        <path d="M16 74 L20 64 Q21 62 23 62 L35 62 Q37 62 38 64 L42 74 Z"
          fill="rgba(212,175,55,0.12)" stroke="rgba(212,175,55,0.28)" strokeWidth="0.7" />
        {/* Rear window */}
        <path d="M18 73 L21 66 Q22 64 23.5 64 L28 64 L28 73 Z"
          fill="rgba(100,180,255,0.08)" stroke="rgba(100,180,255,0.15)" strokeWidth="0.4" />
        {/* Front window */}
        <path d="M30 64 L35 64 Q36 64 37 66 L40 73 L30 73 Z"
          fill="rgba(100,180,255,0.1)" stroke="rgba(100,180,255,0.18)" strokeWidth="0.4" />
        {/* Front bumper */}
        <rect x="48" y="76" width="4" height="10" rx="1.5" fill="rgba(212,175,55,0.12)" stroke="rgba(212,175,55,0.25)" strokeWidth="0.5" />
        {/* Rear bumper */}
        <rect x="4" y="76" width="3" height="10" rx="1" fill="rgba(212,175,55,0.1)" stroke="rgba(212,175,55,0.2)" strokeWidth="0.5" />
        {/* Headlights */}
        <rect x="49" y="76" width="2.5" height="3" rx="0.8" fill="rgba(255,240,180,0.5)" />
        <rect x="49" y="82" width="2.5" height="2.5" rx="0.8" fill="rgba(255,240,180,0.3)" />
        {/* Headlight beam glow */}
        <ellipse cx="58" cy="80" rx="10" ry="6" fill="url(#headlight-glow)" />
        {/* Tail lights */}
        <rect x="5" y="77" width="2" height="2.5" rx="0.5" fill="rgba(255,40,40,0.5)" />
        <rect x="5" y="83" width="2" height="2" rx="0.5" fill="rgba(255,40,40,0.35)" />
        {/* Front wheel */}
        <circle cx="40" cy="88" r="4" fill="rgba(30,30,30,0.6)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        <circle cx="40" cy="88" r="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        {/* Rear wheel */}
        <circle cx="16" cy="88" r="4" fill="rgba(30,30,30,0.6)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        <circle cx="16" cy="88" r="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        {/* Side trim line */}
        <line x1="10" y1="80" x2="48" y2="80" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" />
        {/* Door handle */}
        <rect x="26" y="78" width="4" height="1" rx="0.5" fill="rgba(255,255,255,0.1)" />
      </motion.g>

      {/* ── HUD overlays ─────────────────────────── */}

      {/* "ACCESS GRANTED" badge — appears after scan, before gate opens */}
      <motion.g
        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
        transition={{ duration: total, repeat: Infinity, times: [0, 0.30, 0.34, 0.48, 0.52, 1] }}
      >
        <rect x="55" y="33" width="50" height="12" rx="3" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.3)" strokeWidth="0.6" />
        <text x="80" y="41" fontSize="4.5" fontFamily="monospace" fill="rgba(34,197,94,0.9)" textAnchor="middle" fontWeight="bold">✓ ACCESS GRANTED</text>
      </motion.g>

      {/* Scan indicator — small card icon taps near reader */}
      <motion.g
        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
        transition={{ duration: total, repeat: Infinity, times: [0, 0.22, 0.25, 0.33, 0.36, 1] }}
      >
        <rect x="75" y="61" width="8" height="5" rx="1" fill="rgba(212,175,55,0.2)" stroke="rgba(212,175,55,0.5)" strokeWidth="0.5" />
        <rect x="77" y="62.5" width="3" height="2" rx="0.5" fill="rgba(212,175,55,0.3)" />
      </motion.g>
    </svg>
  );
}

function GaugeIllustration() {
  const { parkedCount, totalSlots, occupancyPercent } = useTelemetry();
  const available = totalSlots - parkedCount;

  // Arc math for the gauge
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270° arc
  const filledLength = arcLength * (occupancyPercent / 100);

  return (
    <svg viewBox="0 0 120 100" fill="none" className="w-full h-full" aria-hidden="true">
      {/* ── Center gauge ──────────────────────── */}
      <g transform="translate(60,46)">
        {/* Background arc (270°) */}
        <circle r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(135)"
        />
        {/* Filled arc */}
        <motion.circle r={radius} fill="none" strokeWidth="7"
          stroke="url(#gauge-grad)"
          strokeLinecap="round"
          transform="rotate(135)"
          animate={{ strokeDasharray: `${filledLength} ${circumference}` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-secondary)" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
        </defs>
        {/* Center percentage */}
        <text y="-2" textAnchor="middle" fontSize="18" fontWeight="bold" fill="var(--color-foreground)" fontFamily="var(--font-sans)">{occupancyPercent}%</text>
        <text y="10" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.35)" fontFamily="monospace" letterSpacing="0.1em">CAPACITY</text>
      </g>

      {/* ── Stat cards ────────────────────────── */}
      {/* Occupied */}
      <g>
        <rect x="0" y="80" width="58" height="18" rx="4" fill="rgba(204,27,43,0.08)" stroke="rgba(204,27,43,0.2)" strokeWidth="0.8" />
        <circle cx="10" cy="89" r="3" fill="rgba(204,27,43,0.4)" />
        <text x="18" y="91.5" fontSize="8" fontWeight="bold" fill="var(--color-primary)" fontFamily="var(--font-sans)">{parkedCount}</text>
        <text x="40" y="91" fontSize="4" fill="rgba(255,255,255,0.3)" fontFamily="monospace">/ {totalSlots} TAKEN</text>
      </g>

      {/* Available */}
      <g>
        <rect x="62" y="80" width="58" height="18" rx="4" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.2)" strokeWidth="0.8" />
        <circle cx="72" cy="89" r="3" fill="rgba(34,197,94,0.5)" />
        <text x="80" y="91.5" fontSize="8" fontWeight="bold" fill="rgba(34,197,94,0.9)" fontFamily="var(--font-sans)">{available}</text>
        <text x="100" y="91" fontSize="4" fill="rgba(255,255,255,0.3)" fontFamily="monospace">FREE</text>
      </g>

      {/* Label */}
      <text x="60" y="10" textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.25)" fontFamily="monospace" fontWeight="bold" letterSpacing="0.15em">LIVE SLOT OVERVIEW</text>
    </svg>
  );
}

import Link from "next/link";

function AnalyticsIllustration() {
  const startX = 15;
  const spacing = 45; 
  
  const data = {
    labels: ["10am", "11am", "12pm"],
    s: [35, 85, 55],
    f: [15, 40, 30],
    v: [5, 25, 15]
  };

  const generatePath = (values: number[]) => {
    const points = values.map((v, i) => ({
      x: startX + i * spacing,
      y: 70 - (v / 100) * 50 // slightly taller map
    }));
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const cpX = (points[i].x + points[i + 1].x) / 2;
      pathD += ` C ${cpX},${points[i].y} ${cpX},${points[i + 1].y} ${points[i + 1].x},${points[i + 1].y}`;
    }
    return { pathD, fillD: `${pathD} L${points[points.length - 1].x},70 L${points[0].x},70 Z`, points };
  };

  const s = generatePath(data.s);
  const f = generatePath(data.f);
  const v = generatePath(data.v);

  return (
    <Link href="/analytics" className="w-full h-full flex flex-col items-center justify-center relative group cursor-pointer pointer-events-auto block">
      
      {/* Click to view full analysis ghost text */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 opacity-70 group-hover:opacity-100 transition-all group-hover:scale-105 duration-300 w-full text-center">
        <span className="text-xs md:text-sm uppercase tracking-[0.3em] text-white font-extrabold inline-flex items-center gap-3 drop-shadow-lg">
          CLICK TO VIEW FULL ANALYSIS
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white group-hover:translate-x-2 transition-transform">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>

      <svg viewBox="0 0 120 80" fill="none" className="w-full h-full overflow-visible mt-10 pointer-events-none" aria-hidden="true">
        {/* Y-Axis Grid Lines */}
        {[20, 35, 50, 65].map((y) => (
          <line key={y} x1="10" y1={y} x2="110" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="1 2" />
        ))}
        
        {/* X-Axis Labels */}
        {data.labels.map((label, i) => (
          <text key={label + i} x={startX + i * spacing} y="77" fontSize="3.5" fill="rgba(255,255,255,0.3)" fontFamily="var(--font-mono)" textAnchor="middle">
            {label}
          </text>
        ))}

        {/* Gradients */}
        <defs>
          <linearGradient id="ill-fill-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" /></linearGradient>
          <linearGradient id="ill-fill-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.2" /><stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0" /></linearGradient>
          <linearGradient id="ill-fill-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient>
        </defs>

        {/* Animated Fills */}
        <motion.path d={s.fillD} fill="url(#ill-fill-s)" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} />
        <motion.path d={f.fillD} fill="url(#ill-fill-f)" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} />
        <motion.path d={v.fillD} fill="url(#ill-fill-v)" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} />

        {/* Animated Lines */}
        <motion.path d={s.pathD} stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }} />
        <motion.path d={f.pathD} stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }} />
        <motion.path d={v.pathD} stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut", delay: 0.4 }} />

        {/* Static Peak Indicator (At 11am) */}
        <g className="opacity-0" style={{ animation: 'fadeIn 0.5s ease forwards 1.8s' }}>
          <line x1={s.points[1].x} y1={12} x2={s.points[1].x} y2={70} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="1 1" />
          <g transform={`translate(${s.points[1].x - 12}, 2)`}>
            <rect x="0" y="0" width="24" height="7" rx="1.5" fill="rgba(212,175,55,0.15)" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
            <text x="12" y="5" textAnchor="middle" fill="var(--color-secondary)" fontSize="3" fontWeight="bold" fontFamily="var(--font-sans)">PEAK (11AM)</text>
          </g>
          <circle cx={s.points[1].x} cy={s.points[1].y} r="2" fill="var(--color-primary)" />
          <circle cx={f.points[1].x} cy={f.points[1].y} r="2" fill="var(--color-secondary)" />
          <circle cx={v.points[1].x} cy={v.points[1].y} r="2" fill="#3b82f6" />
        </g>
      </svg>
    </Link>
  );
}

// ── Feature data ────────────────────────────────────────────────────────────
const features = [
  {
    id: "rfid-verification",
    title: "RFID & QR Verification",
    description: "Campus ID tap or QR scan at the gate reader — instant verification in under one second.",
    Illustration: RfidIllustration,
    tags: ["RFID · QR", "<1s verify"],
    accentColor: "var(--color-primary)",
  },
  {
    id: "access-recording",
    title: "Access Recording",
    description: "Every entry and exit timestamped and logged in real time.",
    Illustration: ActivityIllustration,
    tags: [],
    accentColor: "var(--color-secondary)",
  },
  {
    id: "slot-monitoring",
    title: "Slot Monitoring",
    description: "Per-slot ultrasonic sensors for live, accurate occupancy data.",
    Illustration: GaugeIllustration,
    tags: [],
    accentColor: "var(--color-primary)",
  },
  {
    id: "analytics",
    title: "Dashboard & Reports",
    description: "Historical trends, peak-hour analysis, and exportable occupancy reports for campus admin.",
    Illustration: AnalyticsIllustration,
    tags: ["CSV Export", "90-day history"],
    accentColor: "var(--color-secondary)",
  },
];

export function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal(0.1);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeFeature = features[activeIndex];
  const ActiveIllustration = activeFeature.Illustration;

  return (
    <section
      id="features"
      className="relative mx-auto w-full max-w-[1400px] px-8 lg:px-12 py-[var(--spacing-section)]"
    >
      {/* Section heading */}
      <div
        ref={ref}
        className="mb-16"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <h2 className="text-4xl font-extrabold tracking-[-0.03em] text-[var(--color-foreground)] leading-[1.1] max-w-lg">
          Everything SPARC does,<br />
          <span style={{ color: "var(--color-muted-foreground)", fontWeight: 400 }}>without the complexity.</span>
        </h2>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-10 md:gap-16 items-center">

        {/* Left — step list */}
        <div className="order-2 md:order-1 space-y-2">
          {features.map((feature, index) => {
            const isActive = index === activeIndex;
            return (
              <motion.div
                key={feature.id}
                className="flex items-start gap-6 cursor-pointer rounded-2xl px-5 py-5 transition-colors duration-300"
                style={{
                  background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                  border: isActive ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
                }}
                onMouseEnter={() => setActiveIndex(index)}
                animate={{ opacity: isActive ? 1 : 0.4 }}
                transition={{ duration: 0.3 }}
              >
                {/* Circle indicator */}
                <motion.div
                  className="mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2"
                  style={{
                    borderColor: isActive ? feature.accentColor : "rgba(255,255,255,0.15)",
                    background: isActive ? feature.accentColor : "transparent",
                  }}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {index < activeIndex ? (
                    <span className="text-sm font-bold text-white">✓</span>
                  ) : (
                    <span className="text-sm font-semibold text-white">{index + 1}</span>
                  )}
                </motion.div>

                {/* Text */}
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-semibold text-[var(--color-foreground)]">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm md:text-base text-[var(--color-muted-foreground)] leading-relaxed">
                    {feature.description}
                  </p>
                  {feature.tags.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {feature.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-data text-[10px] px-2 py-1 rounded-sm bg-white/[0.04] border border-white/[0.06] text-[var(--color-muted-foreground)] tracking-widest uppercase"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right — illustration panel */}
        <div className="order-1 md:order-2 relative w-full h-[280px] md:h-[420px] overflow-hidden rounded-2xl bg-[#0F0F11] border border-white/[0.06]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              className="absolute inset-0 flex items-center justify-center p-10"
              initial={{ y: 60, opacity: 0, rotateX: -15 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              exit={{ y: -60, opacity: 0, rotateX: 15 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              style={{ perspective: 800 }}
            >
              <ActiveIllustration />
            </motion.div>
          </AnimatePresence>

          {/* Gradient overlay at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0F0F11] via-[#0F0F11]/40 to-transparent pointer-events-none" />

          {/* Accent border top */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, ${activeFeature.accentColor}, transparent)` }}
            key={`accent-${activeIndex}`}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

      </div>
    </section>
  );
}
