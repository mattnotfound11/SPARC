import type { EventMode } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

/** How many days ahead drivers are warned about an event. */
export const EVENT_WARN_DAYS = 2;

/** "today" while the event day is on, "soon" for the days before it, otherwise null. */
export function eventPhase(event: EventMode | null | undefined, now: number): "today" | "soon" | null {
  if (!event) return null;
  const days = Math.round((event.date - startOfDay(now)) / DAY);
  if (days === 0) return "today";
  return days > 0 && days <= EVENT_WARN_DAYS ? "soon" : null;
}

export type Holds = { closed: number[]; reserved: number };

/** Bays the event takes out of service. Only applies on the event day. */
export function holdsFor(event: EventMode | null | undefined, now: number): Holds | null {
  if (!event || eventPhase(event, now) !== "today") return null;
  if (event.closedFloors.length === 0 && event.reservedPerFloor === 0) return null;
  return { closed: event.closedFloors, reserved: event.reservedPerFloor };
}

export function describeEvent(event: EventMode): string {
  const parts: string[] = [];
  if (event.closedFloors.length) parts.push(`Level ${event.closedFloors.join(", ")} closed`);
  if (event.reservedPerFloor) parts.push(`${event.reservedPerFloor} bays held on each open level`);
  return parts.join(". ");
}
