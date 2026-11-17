"use client";

import { CalendarDays } from "lucide-react";
import { useMinute, usePortalState } from "@/lib/portal/usePortal";

/** Shown to drivers and on the lobby screen while the marshal has event mode on. */
export function EventBanner({ screen = false }: { screen?: boolean }) {
  const { event } = usePortalState();
  const now = useMinute();
  if (!event || event.until <= now) return null;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/[0.10] text-[#ffd666] ${screen ? "px-6 py-5 text-2xl" : "px-4 py-3 text-sm"}`}
    >
      <CalendarDays className={`mt-0.5 shrink-0 ${screen ? "size-8" : "size-4"}`} aria-hidden />
      <p className="leading-snug">
        <span className="font-semibold">{event.name} today.</span> Parking will fill earlier than usual, so arrive early and expect a wait.
      </p>
    </div>
  );
}
