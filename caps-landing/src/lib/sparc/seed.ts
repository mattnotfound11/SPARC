import type { FloorConfig, Slot } from "./types";

/* Floor layout and slot-building helpers for the console's data store. */

export const DEFAULT_CONFIG: FloorConfig[] = [
  { floor: 1, vehicle: "heavy", slots: 20 },
  { floor: 2, vehicle: "heavy", slots: 20 },
  { floor: 3, vehicle: "light", slots: 24 },
  { floor: 4, vehicle: "light", slots: 23 },
  { floor: 5, vehicle: "light", slots: 23 },
];

export const MAX_SLOTS_PER_FLOOR = 60;
export const DAYS_OF_HISTORY = 7;

export function slotCode(floor: number, index: number) {
  return `${String.fromCharCode(64 + floor)}${index}`;
}

export function buildSlots(config: FloorConfig[]): Slot[] {
  return config.flatMap(({ floor, vehicle, slots }) =>
    Array.from({ length: slots }, (_, i) => ({
      code: slotCode(floor, i + 1),
      floor,
      index: i + 1,
      vehicle,
      status: "free" as const,
    })),
  );
}

export function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
