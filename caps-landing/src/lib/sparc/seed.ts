import type { Alert, FloorConfig, LogEntry, RegisteredUser, Slot, UserRole, VehicleClass } from "./types";

/*
 * Synthetic data for the prototype. Everything here is invented: names, NFC IDs,
 * plates and gate traffic. It is generated from a seeded PRNG so a given day always
 * looks the same, and the "today" slice is cut off at the moment the console loads
 * so occupancy and the log agree with each other.
 */

export const DEFAULT_CONFIG: FloorConfig[] = [
  { floor: 1, vehicle: "heavy", slots: 20 },
  { floor: 2, vehicle: "heavy", slots: 20 },
  { floor: 3, vehicle: "light", slots: 24 },
  { floor: 4, vehicle: "light", slots: 23 },
  { floor: 5, vehicle: "light", slots: 23 },
];

export const MAX_SLOTS_PER_FLOOR = 60;
export const DAYS_OF_HISTORY = 7;

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

const FIRST = [
  "Maria", "Jose", "Angelica", "Miguel", "Kristine", "Paolo", "Bianca", "Gabriel", "Jasmine", "Rafael",
  "Camille", "Joshua", "Patricia", "Carlo", "Andrea", "Mark", "Nicole", "Daniel", "Isabel", "Francis",
  "Trisha", "Vincent", "Lorraine", "Emmanuel", "Hazel", "Kevin", "Samantha", "Jericho", "Diane", "Aaron",
];
const LAST = [
  "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Villanueva", "Ramos",
  "Aquino", "Castillo", "Flores", "Navarro", "Salazar", "Domingo", "Pascual", "Lim", "Tan", "Dizon",
  "Fernandez", "Manalo", "Soriano", "De Leon", "Valdez", "Gonzales", "Hernandez", "Rivera", "Pineda", "Agbayani",
];

/** Rough share of the day's traffic by hour (index = hour). Doors open about 05:30, close about 21:45. */
const HOUR_WEIGHT = [0, 0, 0, 0, 0, 2, 8, 22, 30, 20, 12, 12, 16, 18, 14, 10, 8, 10, 7, 4, 2, 1, 0, 0];
const CLOSE_HOUR = 21.75;
const HOUR = 3_600_000;
const MIN = 60_000;

function hexByte(rng: () => number) {
  return Math.floor(rng() * 256)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
}

export function randomNfcId(rng: () => number = Math.random) {
  return [hexByte(rng), hexByte(rng), hexByte(rng), hexByte(rng)].join(":");
}

function randomPlate(rng: () => number) {
  const L = "ABCDEFGHJKLMNPRSTUVXYZ";
  const letters = Array.from({ length: 3 }, () => L[Math.floor(rng() * L.length)]).join("");
  const digits = String(1000 + Math.floor(rng() * 9000));
  return `${letters} ${digits}`;
}

function pickRole(rng: () => number): UserRole {
  const r = rng();
  if (r < 0.52) return "student";
  if (r < 0.74) return "faculty";
  if (r < 0.94) return "staff";
  return "visitor";
}

export function buildUsers(now: number): RegisteredUser[] {
  const rng = mulberry32(7);
  const seen = new Set<string>();
  const users: RegisteredUser[] = [];
  for (let i = 0; i < 56; i++) {
    let nfcId = randomNfcId(rng);
    while (seen.has(nfcId)) nfcId = randomNfcId(rng);
    seen.add(nfcId);
    const vehicle: VehicleClass = rng() < 0.24 ? "heavy" : "light";
    users.push({
      id: `U-${String(i + 1).padStart(3, "0")}`,
      nfcId,
      name: `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`,
      role: pickRole(rng),
      vehicle,
      plate: randomPlate(rng),
      // a handful of suspended cards so the status filter has something to show
      active: rng() > 0.07,
      createdAt: now - Math.floor(rng() * 90) * 24 * HOUR,
    });
  }
  return users;
}

export function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

type DayResult = {
  logs: Omit<LogEntry, "id">[];
  inside: { slot: Slot; user: RegisteredUser; since: number }[];
};

/** Simulates one day of gate traffic. `cutoff` truncates it for "today". */
function simulateDay(
  dayStart: number,
  cutoff: number | null,
  seed: number,
  config: FloorConfig[],
  users: RegisteredUser[],
  weekend: boolean,
): DayResult {
  const rng = mulberry32(seed);
  const scale = weekend ? 0.3 : 0.82;
  const eligible = users.filter((u) => u.active);

  type Visit = { t: number; exit: number; user: RegisteredUser; id: string };
  const visits: Visit[] = [];
  const busyUntil = new Map<string, number>();

  for (let h = 0; h < 24; h++) {
    const n = Math.round(HOUR_WEIGHT[h] * scale * (0.85 + rng() * 0.3));
    for (let i = 0; i < n; i++) {
      const t = dayStart + h * HOUR + Math.floor(rng() * HOUR);
      if (t < dayStart + 5.5 * HOUR) continue;
      let user: RegisteredUser | null = null;
      for (let tries = 0; tries < 8 && !user; tries++) {
        const c = eligible[Math.floor(rng() * eligible.length)];
        if ((busyUntil.get(c.id) ?? 0) <= t) user = c;
      }
      if (!user) continue;
      const dwell = (35 + Math.pow(rng(), 1.5) * 420) * MIN;
      const exit = Math.max(t + 20 * MIN, Math.min(t + dwell, dayStart + CLOSE_HOUR * HOUR));
      busyUntil.set(user.id, exit + 15 * MIN);
      visits.push({ t, exit, user, id: `V-${seed}-${visits.length}` });
    }
  }
  visits.sort((a, b) => a.t - b.t);

  // "Today" is cut off at the moment the console loads. Outside class hours that would show an
  // empty building, so keep the most recent arrivals parked until the building reads as in use.
  if (cutoff !== null) {
    const capacity = config.reduce((n, f) => n + f.slots, 0);
    const recent = visits.filter((v) => v.t <= cutoff && v.t > cutoff - 9 * HOUR);
    let insideNow = visits.filter((v) => v.t <= cutoff && v.exit > cutoff).length;
    const target = Math.min(Math.round(capacity * 0.55), Math.round(recent.length * 0.7));
    for (const v of recent.sort((a, b) => b.t - a.t)) {
      if (insideNow >= target) break;
      if (v.exit <= cutoff) {
        v.exit = cutoff + (20 + rng() * 150) * MIN;
        insideNow++;
      }
    }
  }

  const allSlots = buildSlots(config);
  const free: Record<VehicleClass, Slot[]> = {
    heavy: allSlots.filter((s) => s.vehicle === "heavy"),
    light: allSlots.filter((s) => s.vehicle === "light"),
  };
  const active: { exit: number; slot: Slot; vehicle: VehicleClass }[] = [];
  const logs: DayResult["logs"] = [];
  const inside: DayResult["inside"] = [];

  for (const v of visits) {
    if (cutoff !== null && v.t > cutoff) continue;

    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].exit <= v.t) {
        free[active[i].vehicle].push(active[i].slot);
        active.splice(i, 1);
      }
    }

    const pool = free[v.user.vehicle];
    if (pool.length === 0) {
      logs.push({
        visitId: null,
        at: v.t,
        event: "denied",
        nfcId: v.user.nfcId,
        userId: v.user.id,
        userName: v.user.name,
        slot: null,
        floor: null,
        vehicle: v.user.vehicle,
        result: "denied",
        reason: "No free slot for this vehicle type",
      });
      continue;
    }
    const slot = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    active.push({ exit: v.exit, slot, vehicle: v.user.vehicle });

    logs.push({
      visitId: v.id,
      at: v.t,
      event: "entry",
      nfcId: v.user.nfcId,
      userId: v.user.id,
      userName: v.user.name,
      slot: slot.code,
      floor: slot.floor,
      vehicle: v.user.vehicle,
      result: "granted",
    });

    if (cutoff === null || v.exit <= cutoff) {
      logs.push({
        visitId: v.id,
        at: v.exit,
        event: "exit",
        nfcId: v.user.nfcId,
        userId: v.user.id,
        userName: v.user.name,
        slot: slot.code,
        floor: slot.floor,
        vehicle: v.user.vehicle,
        result: "granted",
      });
    } else {
      inside.push({ slot, user: v.user, since: v.t });
    }
  }

  // Taps from cards that are not on the registry
  const unknown = 2 + Math.floor(rng() * 5);
  const known = new Set(users.map((u) => u.nfcId));
  for (let i = 0; i < unknown; i++) {
    const at = dayStart + (6 + rng() * 14.5) * HOUR;
    if (cutoff !== null && at > cutoff) continue;
    let nfcId = randomNfcId(rng);
    while (known.has(nfcId)) nfcId = randomNfcId(rng);
    logs.push({
      visitId: null,
      at,
      event: "denied",
      nfcId,
      userId: null,
      userName: null,
      slot: null,
      floor: null,
      vehicle: null,
      result: "denied",
      reason: "Unregistered ID",
    });
  }

  return { logs, inside };
}

export type SeedData = {
  config: FloorConfig[];
  slots: Slot[];
  users: RegisteredUser[];
  logs: LogEntry[];
  alerts: Alert[];
  nextLogSeq: number;
};

export function createSeed(now: number): SeedData {
  const config = DEFAULT_CONFIG.map((f) => ({ ...f }));
  const users = buildUsers(now);
  const today = startOfDay(now);

  const rawLogs: Omit<LogEntry, "id">[] = [];
  let inside: DayResult["inside"] = [];

  for (let d = DAYS_OF_HISTORY - 1; d >= 0; d--) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - d);
    const start = dayStart.getTime();
    const day = dayStart.getDay();
    const res = simulateDay(start, d === 0 ? now : null, 100 + d, config, users, day === 0 || day === 6);
    rawLogs.push(...res.logs);
    if (d === 0) inside = res.inside;
  }

  rawLogs.sort((a, b) => a.at - b.at);
  const logs: LogEntry[] = rawLogs
    .map((l, i) => ({ ...l, id: `L-${String(i + 1).padStart(5, "0")}` }))
    .reverse();

  const slots = buildSlots(config);
  const byCode = new Map(slots.map((s) => [s.code, s]));
  for (const { slot, user, since } of inside) {
    const target = byCode.get(slot.code);
    if (!target) continue;
    target.status = "occupied";
    target.occupant = { userId: user.id, name: user.name, plate: user.plate, nfcId: user.nfcId, since };
  }

  const alerts: Alert[] = logs
    .filter((l) => l.at >= today && l.event === "denied" && l.reason === "Unregistered ID")
    .slice(0, 3)
    .map((l) => ({ id: `A-${l.id}`, at: l.at, nfcId: l.nfcId, acknowledged: false }));

  return { config, slots, users, logs, alerts, nextLogSeq: logs.length + 1 };
}
