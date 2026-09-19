"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type TelemetryContextValue = {
  parkedCount: number;
  totalSlots: number;
  occupancyPercent: number;
  studentsCount: number;
  facultyCount: number;
  visitorsCount: number;
};

const TelemetryContext = createContext<TelemetryContextValue>({
  parkedCount: 342,
  totalSlots: 500,
  occupancyPercent: 68,
  studentsCount: 205,
  facultyCount: 103,
  visitorsCount: 34,
});

export function useTelemetry() {
  return useContext(TelemetryContext);
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const TOTAL = 500;
  const [parkedCount, setParkedCount] = useState(342);

  useEffect(() => {
    const interval = setInterval(() => {
      setParkedCount((prev) => {
        const changes = [1, 2, 5, -1, -3];
        const delta = changes[Math.floor(Math.random() * changes.length)];
        const next = prev + delta;
        if (next < 300) return 300;
        if (next > 450) return 450;
        return next;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const occupancyPercent = Math.round((parkedCount / TOTAL) * 100);
  
  // Create realistic breakdowns based on parkedCount
  const studentsCount = Math.round(parkedCount * 0.60);
  const facultyCount = Math.round(parkedCount * 0.30);
  const visitorsCount = parkedCount - studentsCount - facultyCount;

  return (
    <TelemetryContext.Provider
      value={{ 
        parkedCount, 
        totalSlots: TOTAL, 
        occupancyPercent,
        studentsCount,
        facultyCount,
        visitorsCount
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}
