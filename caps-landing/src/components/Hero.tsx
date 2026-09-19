"use client";

import { NumberTicker } from "@/components/ui/number-ticker";
import { HeroRadarBg } from "@/components/ui/hero-radar-bg";
import { useTelemetry } from "@/components/TelemetryProvider";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from "framer-motion";
import { ChevronDown, ArrowRight, LayoutDashboard } from "lucide-react";
import Image from "next/image";

const HEADLINE_PHRASES = [
  "Total visibility.",
  "Zero congestion.",
  "Smarter campus.",
];

export function Hero() {
  const { parkedCount, totalSlots, occupancyPercent } = useTelemetry();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [bgSlide, setBgSlide] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Use MotionValues to track mouse position without triggering React re-renders
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  // Background carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setBgSlide((prev) => (prev === 0 ? 1 : 0));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Track raw viewport coordinates relative to the full-width wrapper
  useEffect(() => {
    const handleGlobalMouse = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };
    document.addEventListener('mousemove', handleGlobalMouse);
    return () => document.removeEventListener('mousemove', handleGlobalMouse);
  }, []);
  
  const spotlightBackground = useMotionTemplate`radial-gradient(700px circle at ${mouseX}px ${mouseY}px, rgba(204,27,43,0.07), rgba(212,175,55,0.025) 40%, transparent 65%)`;

  // Typewriter effect
  useEffect(() => {
    const currentPhrase = HEADLINE_PHRASES[phraseIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayedText === currentPhrase) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      setPhraseIndex((i) => (i + 1) % HEADLINE_PHRASES.length);
    } else if (isDeleting) {
      timeout = setTimeout(() => {
        setDisplayedText(currentPhrase.slice(0, displayedText.length - 1));
      }, 40);
    } else {
      timeout = setTimeout(() => {
        setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
      }, 70);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, phraseIndex]);

  // SVG ring math
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - occupancyPercent / 100);

  return (
    <div ref={wrapperRef} className="w-full relative">
      {/* Absolute backgrounds that span the full viewport width but are contained within Hero's height */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Slide 0: Previous Background (Radar + Gradient) */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: bgSlide === 0 ? 1 : 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <HeroRadarBg />
          
          {/* Ambient lamp cone: static, fades naturally */}
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background: 'radial-gradient(ellipse 55% 65% at 30% 40%, rgba(204,27,43,0.09) 0%, rgba(212,175,55,0.04) 45%, transparent 70%)',
            }}
          />
          
          {/* Cursor spotlight: tracks mouse within this section using motion template */}
          <motion.div
            className="absolute inset-0 transition-opacity duration-300"
            aria-hidden="true"
            style={{ background: spotlightBackground }}
          />
        </motion.div>

        {/* Slide 1: Image Background */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: bgSlide === 1 ? 1 : 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <Image 
            src="/parkingan.png"
            alt="SPARC Parking Overview"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-background/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </motion.div>
      </div>

      <section
        aria-labelledby="hero-heading"
        className="relative mx-auto w-full max-w-[1400px] px-8 lg:px-12 pt-32 pb-20 lg:pt-32 lg:pb-24 flex flex-col justify-center min-h-[75vh]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-24">
          {/* Left Column: Text */}
        <div className="flex-1 max-w-2xl">
          {/* System tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase border border-[var(--color-border)] text-[var(--color-muted-foreground)] bg-white/[0.03] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-blink-status" />
              IoT Smart Parking System
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            id="hero-heading"
            className="mt-8 text-5xl font-extrabold tracking-tight text-[var(--color-foreground)] sm:text-6xl lg:text-7xl leading-[1.08]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Verified access.
            <br />
            <span className="text-gradient-red-gold">
              {displayedText}
              {/* Blinking cursor */}
              <span
                className="ml-1 inline-block w-[3px] h-[0.85em] align-middle bg-[var(--color-primary)] rounded-sm"
                style={{ animation: "blink-status 1s step-end infinite" }}
              />
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--color-muted-foreground)]"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            RFID-powered access control meets live parking occupancy monitoring.
            Built for the University of San Agustin.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold shadow-lg shadow-[var(--color-primary)]/25 hover:brightness-110 hover:shadow-[var(--color-primary)]/40 transition-all duration-300 active:scale-[0.98] group"
            >
              See How It Works
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </a>
            <a
              href="#login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-[var(--color-border-hover)] text-sm font-semibold text-[var(--color-foreground)] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 active:scale-[0.98] group"
            >
              <LayoutDashboard className="h-4 w-4 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)] transition-colors" strokeWidth={1.5} />
              Access Portals
            </a>
          </motion.div>
        </div>

        {/* Right Column: Live Telemetry Widget */}
        <motion.div
          className="flex-none lg:w-[340px] w-full mt-12 lg:mt-0"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative overflow-hidden rounded-2xl glass-card-elevated p-8">
            {/* Live Indicator */}
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs font-bold tracking-[0.15em] text-[var(--color-muted-foreground)] uppercase">
                Live Telemetry
              </span>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success-bg)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-success)] animate-blink-status" />
                </span>
                <span className="text-[10px] font-bold text-[var(--color-success)] uppercase tracking-widest">
                  Live
                </span>
              </div>
            </div>

            {/* Circular Progress Ring + Count */}
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
                  {/* Background ring */}
                  <circle
                    cx="64" cy="64" r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="8"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="64" cy="64" r={radius}
                    fill="none"
                    stroke="url(#ring-gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-secondary)" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-[var(--color-foreground)] tabular-nums">
                    {occupancyPercent}%
                  </span>
                  <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                    Full
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col">
                <span className="text-4xl font-black text-[var(--color-foreground)] tabular-nums tracking-tight">
                  <NumberTicker value={parkedCount} />
                </span>
                <span className="text-sm font-medium text-[var(--color-muted-foreground)] mt-1">
                  of {totalSlots} slots occupied
                </span>
              </div>
            </div>

            {/* Subtle inner glow accents */}
            <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[var(--color-secondary)]/8 blur-[60px]" />
            <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[var(--color-primary)]/8 blur-[60px]" />
          </div>
        </motion.div>
      </div>

    </section>
    </div>
  );
}
