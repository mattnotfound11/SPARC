"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelemetry } from "@/components/TelemetryProvider";

export const FloatingTelemetry = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { parkedCount, totalSlots, occupancyPercent } = useTelemetry();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (occupancyPercent / 100) * circumference;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-50 pointer-events-auto"
        >
          <div
            className="flex flex-col gap-6 p-5 rounded-2xl glass-card-elevated scanlines edge-shine"
            style={{
              backgroundColor: "rgba(14, 12, 12, 0.92)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-8">
              <span className="text-xs font-bold tracking-widest text-[#888] uppercase">
                Live Telemetry
              </span>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-500 tracking-wider">LIVE</span>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex items-center gap-6">
              {/* Circular Progress */}
              <div className="relative flex items-center justify-center">
                <svg width="84" height="84" className="transform -rotate-90">
                  <defs>
                    <linearGradient id="floatProgressGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#CC1B2B" />
                      <stop offset="100%" stopColor="#D4AF37" />
                    </linearGradient>
                  </defs>

                  {/* Background Track */}
                  <circle
                    cx="42" cy="42" r={radius}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                    fill="transparent"
                  />

                  {/* Animated Progress */}
                  <motion.circle
                    cx="42" cy="42" r={radius}
                    stroke="url(#floatProgressGradient)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>

                {/* Inner Text */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-white tracking-tight leading-none">
                    {occupancyPercent}%
                  </span>
                  <span className="text-[9px] font-semibold text-[#888] tracking-widest mt-1">
                    FULL
                  </span>
                </div>
              </div>

              {/* Data Text */}
              <div className="flex flex-col justify-center">
                <motion.span
                  key={parkedCount}
                  className="text-4xl font-extrabold text-white tracking-tight leading-none mb-1 font-data"
                  initial={{ opacity: 0.5, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {parkedCount}
                </motion.span>
                <span className="text-sm font-medium text-[#888] leading-tight">
                  of {totalSlots} slots
                </span>
                <span className="text-sm font-medium text-[#888] leading-tight">
                  occupied
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
