"use client";

import { CalendarDays } from "lucide-react";
import { describeEvent, eventPhase } from "@/lib/portal/event";
import { useMinute, usePortalState } from "@/lib/portal/usePortal";

/** Shown to drivers and on the lobby screen on the event day and the couple of days before it. */
export function EventBanner({ screen = false }: { screen?: boolean }) {
  const { event } = usePortalState();
  const now = useMinute();
  const phase = eventPhase(event, now);
  if (!event || !phase) return null;
  const when = phase === "today" ? "today" : `on ${new Date(event.date).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}`;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/[0.10] text-[#ffd666] ${screen ? "px-6 py-5 text-2xl" : "px-4 py-3 text-sm"}`}
    >
      <CalendarDays className={`mt-0.5 shrink-0 ${screen ? "size-8" : "size-4"}`} aria-hidden />
      <p className="leading-snug">
        <span className="font-semibold">
          {event.name} {when}.
        </span>{" "}
        {describeEvent(event) ? `${describeEvent(event)}. ` : ""}
        Parking will fill earlier than usual, so arrive early and expect a wait.
      </p>
    </div>
  );
}
