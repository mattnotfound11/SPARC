import type { FloorConfig, LogEntry, RegisteredUser, Slot } from "./types";
import type { SparcState } from "./store";
import { DAYS_OF_HISTORY, startOfDay } from "./seed";
import { holdsFor } from "@/lib/portal/event";
import { portal } from "@/lib/portal/store";

export type FloorStat = {
  floor: number;
  total: number;
  /** Free bays after event holds: a closed floor offers none, a reserved floor offers fewer. */
  free: number;
  occupied: number;
  /** Free bays an event is holding back. */
  held: number;
};

export function floorStats(config: FloorConfig[], slots: Slot[], now: number = Date.now()): FloorStat[] {
  const holds = holdsFor(portal.get().event, now);
  return config.map((f) => {
    const mine = slots.filter((s) => s.floor === f.floor);
    const occupied = mine.filter((s) => s.status === "occupied").length;
    const free = mine.length - occupied;
    const held = !holds ? 0 : holds.closed.includes(f.floor) ? free : Math.min(holds.reserved, free);
    return {
      floor: f.floor,
      total: mine.length,
      free: free - held,
      occupied,
      held,
    };
  });
}

/** The first free bay on the floor the facilitator chose, leaving out a floor or bays an event is holding. */
export function pickFreeSlot(config: FloorConfig[], slots: Slot[], floor: number, now: number = Date.now()): Slot | undefined {
  if (!config.some((f) => f.floor === floor)) return undefined;
  const holds = holdsFor(portal.get().event, now);
  if (holds?.closed.includes(floor)) return undefined;
  const free = slots.filter((s) => s.floor === floor && s.status === "free");
  return free.length > (holds?.reserved ?? 0) ? free[0] : undefined;
}

export function buildingTotals(stats: FloorStat[]) {
  return stats.reduce(
    (t, f) => ({
      total: t.total + f.total,
      free: t.free + f.free,
      occupied: t.occupied + f.occupied,
      held: t.held + f.held,
    }),
    { total: 0, free: 0, occupied: 0, held: 0 },
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

function dateKey(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** The calendar day containing `date`, labelled relative to `now` (Today, Yesterday, or "Tue, Nov 10"). */
export function dayRangeFor(date: Date | number, now: number): DayRange {
  const dt = new Date(startOfDay(typeof date === "number" ? date : date.getTime()));
  const next = new Date(dt);
  next.setDate(next.getDate() + 1);
  const ago = Math.round((startOfDay(now) - dt.getTime()) / 86_400_000);
  const weekday = dt.toLocaleDateString("en-PH", { weekday: "short" });
  const date_ = dt.toLocaleDateString("en-PH", { month: "short", day: "numeric", ...(dt.getFullYear() !== new Date(now).getFullYear() && { year: "numeric" }) });
  return {
    key: dateKey(dt),
    start: dt.getTime(),
    end: next.getTime(),
    label: ago === 0 ? "Today" : ago === 1 ? "Yesterday" : `${weekday}, ${date_}`,
    short: ago === 0 ? "Today" : ago === 1 ? "Yest." : weekday,
  };
}

/** Parses a `YYYY-MM-DD` key (from a date input) as a local calendar day. */
export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(dt.getTime()) || dateKey(dt) !== key ? null : dt;
}

export function dayRanges(now: number): DayRange[] {
  const today = startOfDay(now);
  return Array.from({ length: DAYS_OF_HISTORY }, (_, d) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - d);
    return dayRangeFor(dt, now);
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
  peakOccupancy: number;
  peakHour: number | null;
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
  const floors = new Map<number, number>();

  for (const l of logs) {
    const h = new Date(l.at).getHours();
    if (l.event === "entry") {
      hourly[h].entries++;
      running++;
      if (l.floor) floors.set(l.floor, (floors.get(l.floor) ?? 0) + 1);
      if (running > peak) {
        peak = running;
        peakHour = h;
      }
    } else {
      hourly[h].exits++;
      running = Math.max(0, running - 1);
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
    peakOccupancy: peak,
    peakHour,
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

export function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

/** A member who signed up but whose pass the parking office hasn't activated yet. */
export function isPending(user: RegisteredUser) {
  return user.expiresAt === 0;
}

/** A semester pass that has run past its expiry date. A pending member never had one, so isn't expired. */
export function isExpired(user: RegisteredUser, now: number) {
  return !isPending(user) && user.expiresAt <= now;
}

/** Expired, or due to lapse within the given number of days. */
export function isExpiringSoon(user: RegisteredUser, now: number, withinDays = 3) {
  return !isExpired(user, now) && user.expiresAt - now <= withinDays * 24 * 60 * 60 * 1000;
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
    (l.slot ?? "").toLowerCase() === q
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const EXPIRING_DAYS = 5;

export type PassStatus = { state: "pending" | "active" | "expiring" | "expired" | "suspended"; daysLeft: number };

/** What the scanner shows about a driver's semester pass. */
export function passStatus(user: RegisteredUser, now: number): PassStatus {
  const daysLeft = Math.max(0, Math.ceil((user.expiresAt - now) / DAY_MS));
  if (isPending(user)) return { state: "pending", daysLeft: 0 };
  if (!user.active) return { state: "suspended", daysLeft };
  if (user.expiresAt <= now) return { state: "expired", daysLeft: 0 };
  return { state: daysLeft <= EXPIRING_DAYS ? "expiring" : "active", daysLeft };
}

/**
 * One report spanning several days (newest first, as from dayRanges): totals add up, hourly entries/exits
 * are summed, and each hour's occupancy is the busiest it got at that hour on any of the days.
 */
export function combineReports(reports: DayReport[], label: string): DayReport & { peakDay: DayRange | null } {
  const oldest = reports[reports.length - 1].range;
  const newest = reports[0].range;
  const hourly: HourPoint[] = Array.from({ length: 24 }, (_, hour) => {
    const occ = reports.map((r) => r.hourly[hour].occupancy).filter((v): v is number => v !== null);
    return {
      hour,
      entries: reports.reduce((n, r) => n + r.hourly[hour].entries, 0),
      exits: reports.reduce((n, r) => n + r.hourly[hour].exits, 0),
      occupancy: occ.length ? Math.max(...occ) : null,
    };
  });
  const busiest = reports.reduce<DayReport | null>((b, r) => (r.peakOccupancy > (b?.peakOccupancy ?? 0) ? r : b), null);
  return {
    range: { key: `${oldest.key}_${newest.key}`, start: oldest.start, end: newest.end, label, short: label },
    entries: reports.reduce((n, r) => n + r.entries, 0),
    exits: reports.reduce((n, r) => n + r.exits, 0),
    peakOccupancy: busiest?.peakOccupancy ?? 0,
    peakHour: busiest?.peakHour ?? null,
    peakDay: busiest?.range ?? null,
    hourly,
    perFloor: reports[0].perFloor.map((f) => ({ floor: f.floor, entries: reports.reduce((n, r) => n + (r.perFloor.find((x) => x.floor === f.floor)?.entries ?? 0), 0) })),
  };
}
