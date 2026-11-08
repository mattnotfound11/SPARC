import type { FloorConfig, LogEntry, Slot, VehicleClass } from "./types";
import type { SparcState } from "./store";
import { DAYS_OF_HISTORY, startOfDay } from "./seed";

export const VEHICLE_LABEL: Record<VehicleClass, string> = {
  heavy: "SUV / Van",
  light: "Light vehicle",
};

export type FloorStat = {
  floor: number;
  vehicle: VehicleClass;
  total: number;
  free: number;
  reserved: number;
  occupied: number;
};

export function floorStats(config: FloorConfig[], slots: Slot[]): FloorStat[] {
  return config.map((f) => {
    const mine = slots.filter((s) => s.floor === f.floor);
    const reserved = mine.filter((s) => s.status === "reserved").length;
    const occupied = mine.filter((s) => s.status === "occupied").length;
    return {
      floor: f.floor,
      vehicle: f.vehicle,
      total: mine.length,
      free: mine.length - reserved - occupied,
      reserved,
      occupied,
    };
  });
}

export function buildingTotals(stats: FloorStat[]) {
  return stats.reduce(
    (t, f) => ({
      total: t.total + f.total,
      free: t.free + f.free,
      reserved: t.reserved + f.reserved,
      occupied: t.occupied + f.occupied,
    }),
    { total: 0, free: 0, reserved: 0, occupied: 0 },
  );
}

/** Availability tone, matching the landing page's bay-count demo. */
export function availabilityTone(free: number, total: number): "crimson" | "gold" | "live" {
  if (total === 0) return "crimson";
  const share = free / total;
  if (share <= 0.1) return "crimson";
  if (share <= 0.3) return "gold";
  return "live";
}

export type DayRange = { key: string; start: number; end: number; label: string; short: string };

export function dayRanges(now: number): DayRange[] {
  const today = startOfDay(now);
  return Array.from({ length: DAYS_OF_HISTORY }, (_, d) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - d);
    const start = dt.getTime();
    const next = new Date(dt);
    next.setDate(next.getDate() + 1);
    const weekday = dt.toLocaleDateString("en-PH", { weekday: "short" });
    const date = dt.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    return {
      key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`,
      start,
      end: next.getTime(),
      label: d === 0 ? "Today" : d === 1 ? "Yesterday" : `${weekday}, ${date}`,
      short: d === 0 ? "Today" : d === 1 ? "Yest." : weekday,
    };
  });
}

export type HourPoint = {
  hour: number;
  entries: number;
  exits: number;
  /** Vehicles inside at the end of the hour; null for hours that haven't happened yet. */
  occupancy: number | null;
};

export type DayReport = {
  range: DayRange;
  entries: number;
  exits: number;
  denied: number;
  unregistered: number;
  peakOccupancy: number;
  peakHour: number | null;
  avgStayMin: number | null;
  hourly: HourPoint[];
  perFloor: { floor: number; entries: number }[];
};

export function dayReport(state: SparcState, range: DayRange): DayReport {
  const logs = state.logs.filter((l) => l.at >= range.start && l.at < range.end).sort((a, b) => a.at - b.at);
  const hourly: HourPoint[] = Array.from({ length: 24 }, (_, hour) => ({ hour, entries: 0, exits: 0, occupancy: null }));
  const currentHour = state.now >= range.start && state.now < range.end ? new Date(state.now).getHours() : 23;

  let running = 0;
  let peak = 0;
  let peakHour: number | null = null;
  const entryAt = new Map<string, number>();
  const stays: number[] = [];
  const floors = new Map<number, number>();
  let denied = 0;
  let unregistered = 0;

  for (const l of logs) {
    const h = new Date(l.at).getHours();
    if (l.event === "entry") {
      hourly[h].entries++;
      running++;
      if (l.visitId) entryAt.set(l.visitId, l.at);
      if (l.floor) floors.set(l.floor, (floors.get(l.floor) ?? 0) + 1);
      if (running > peak) {
        peak = running;
        peakHour = h;
      }
    } else if (l.event === "exit") {
      hourly[h].exits++;
      running = Math.max(0, running - 1);
      const start = l.visitId ? entryAt.get(l.visitId) : undefined;
      if (start) stays.push((l.at - start) / 60_000);
    } else {
      denied++;
      if (l.reason === "Unregistered ID") unregistered++;
    }
  }

  // end-of-hour occupancy
  let carry = 0;
  for (const p of hourly) {
    carry += p.entries - p.exits;
    p.occupancy = p.hour <= currentHour ? Math.max(0, carry) : null;
  }

  return {
    range,
    entries: hourly.reduce((n, p) => n + p.entries, 0),
    exits: hourly.reduce((n, p) => n + p.exits, 0),
    denied,
    unregistered,
    peakOccupancy: peak,
    peakHour,
    avgStayMin: stays.length ? stays.reduce((a, b) => a + b, 0) / stays.length : null,
    hourly,
    perFloor: state.config.map((f) => ({ floor: f.floor, entries: floors.get(f.floor) ?? 0 })),
  };
}

export function totalCapacity(config: FloorConfig[]) {
  return config.reduce((n, f) => n + f.slots, 0);
}

export function formatClock(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? " AM" : " PM"}`;
}

export function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatDuration(minutes: number | null) {
  if (minutes === null) return "—";
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function timeAgo(ms: number, now: number) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function matchesLog(l: LogEntry, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (l.userName ?? "").toLowerCase().includes(q) ||
    l.nfcId.toLowerCase().includes(q) ||
    (l.slot ?? "").toLowerCase() === q ||
    (l.reason ?? "").toLowerCase().includes(q)
  );
}
