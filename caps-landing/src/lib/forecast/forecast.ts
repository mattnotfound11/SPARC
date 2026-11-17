import type { FloorConfig, LogEntry } from "@/lib/sparc/types";

/*
 * Occupancy forecast. No machine learning: for each weekday and 15-minute slot, average how many
 * cars were inside each deck (floor) on the same weekday in past weeks. Pure functions over the
 * entry/exit log, so the backend can replace `buildProfile` with a query and keep the rest.
 */

export const SLOT_MINUTES = 15;
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;
/** Past weeks of the same weekday that feed the average. */
export const WEEKS_BACK = 4;
/** Share of capacity at which a deck counts as full / filling up. */
export const FULL_RATIO = 0.9;
export const FILLING_RATIO = 0.65;

export type DeckStatus = "available" | "filling" | "full";

/** profile[floor][weekday][slot] = average cars inside at the end of that slot, or null when no day had data. */
export type Profile = Map<number, (number | null)[][]>;

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const slotOf = (ms: number) => Math.floor((ms - startOfDay(ms)) / (SLOT_MINUTES * 60 * 1000));

export function buildProfile(logs: LogEntry[], floors: number[], now: number): Profile {
  const today = startOfDay(now);
  const since = today - WEEKS_BACK * 7 * DAY;
  const past = logs.filter((l) => l.floor !== null && l.at >= since && l.at < today);

  const profile: Profile = new Map();
  for (const floor of floors) {
    const sums = Array.from({ length: 7 }, () => new Array<number>(SLOTS_PER_DAY).fill(0));
    const days = Array.from({ length: 7 }, () => new Set<number>());

    const byDay = new Map<number, LogEntry[]>();
    for (const l of past) {
      if (l.floor !== floor) continue;
      const key = startOfDay(l.at);
      byDay.set(key, [...(byDay.get(key) ?? []), l]);
    }

    for (const [day, events] of byDay) {
      const weekday = new Date(day).getDay();
      const delta = new Array<number>(SLOTS_PER_DAY).fill(0);
      for (const e of events) delta[slotOf(e.at)] += e.event === "entry" ? 1 : -1;
      let running = 0;
      for (let s = 0; s < SLOTS_PER_DAY; s++) {
        running = Math.max(0, running + delta[s]);
        sums[weekday][s] += running;
      }
      days[weekday].add(day);
    }

    profile.set(
      floor,
      sums.map((row, weekday) => {
        const n = days[weekday].size;
        return row.map((v) => (n ? v / n : null));
      }),
    );
  }
  return profile;
}

/** Whether there is any history to forecast from. */
export function hasHistory(profile: Profile) {
  for (const weekdays of profile.values()) for (const row of weekdays) if (row.some((v) => v !== null)) return true;
  return false;
}

export function statusFor(ratio: number): DeckStatus {
  if (ratio >= FULL_RATIO) return "full";
  if (ratio >= FILLING_RATIO) return "filling";
  return "available";
}

export const STATUS_LABEL: Record<DeckStatus, string> = {
  available: "Likely available",
  filling: "Filling up",
  full: "Likely full",
};

export type DeckForecast = {
  floor: number;
  /** Worst expected fill over the next hour, 0..1. */
  ratio: number;
  status: DeckStatus;
  /** "7:45 AM": the end of the 15-minute slot in which this deck usually reaches full today; null if it usually doesn't. */
  usuallyFullBy: string | null;
  /** The message to show drivers. */
  message: string;
};

const WEEKDAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

export function clock(slot: number) {
  const minutes = slot * SLOT_MINUTES;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function forecastDecks(profile: Profile, config: FloorConfig[], now: number): DeckForecast[] {
  const weekday = new Date(now).getDay();
  const current = slotOf(now);
  return config.map(({ floor, slots }) => {
    const row = profile.get(floor)?.[weekday] ?? [];
    const capacity = Math.max(1, slots);
    const window = row.slice(current, current + 4).filter((v): v is number => v !== null);
    const ratio = window.length ? Math.min(1, Math.max(...window) / capacity) : 0;

    const fullAt = row.findIndex((v) => v !== null && v / capacity >= FULL_RATIO);
    // a slot's value is the occupancy at its end, so "full by" is the end of the slot that reached it
    const usuallyFullBy = fullAt >= 0 ? clock(fullAt + 1) : null;

    const known = row.some((v) => v !== null);
    const status = statusFor(ratio);
    let message: string;
    if (!known) message = "Not enough history yet.";
    else if (usuallyFullBy && fullAt >= current) message = `Level ${floor} usually fills by ${usuallyFullBy} on ${WEEKDAY_PLURAL[weekday]}.`;
    else if (usuallyFullBy) message = `Level ${floor} usually filled by ${usuallyFullBy} today.`;
    else message = `Level ${floor} doesn't usually fill on ${WEEKDAY_PLURAL[weekday]}.`;
    return { floor, ratio, status, usuallyFullBy, message };
  });
}

/**
 * Two weeks of plausible gate traffic, for demos before real history exists. Deterministic, and every
 * entry has its exit, so the profile it produces is realistic: morning rush on the lower decks.
 */
export function sampleHistory(config: FloorConfig[], now: number, days = 14): LogEntry[] {
  const logs: LogEntry[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const today = startOfDay(now);
  let n = 0;
  for (let d = 1; d <= days; d++) {
    const day = today - d * DAY;
    const weekend = [0, 6].includes(new Date(day).getDay());
    for (const { floor, slots } of config) {
      // lower decks fill first, as drivers take the nearest bay
      const demand = (weekend ? 0.2 : 1.1) - (floor - 1) * 0.14;
      const cars = Math.round(slots * Math.max(0.1, demand));
      for (let i = 0; i < cars; i++) {
        // a morning rush from 7:00 to 9:30, with a smaller wave after lunch
        const arrive = (7 + rand() * 2.5 + (rand() < 0.1 ? 4 : 0)) * 60 * 60 * 1000;
        const stay = (3 + rand() * 6) * 60 * 60 * 1000;
        const base = { visitId: `S-${n}`, nfcId: "", userId: null, userName: null, slot: null, floor, vehicle: null } as const;
        logs.push({ ...base, id: `S-${n}-in`, at: day + arrive, event: "entry" });
        logs.push({ ...base, id: `S-${n}-out`, at: Math.min(day + arrive + stay, day + DAY - 1), event: "exit" });
        n++;
      }
    }
  }
  return logs.sort((a, b) => b.at - a.at);
}
