import type { FloorConfig, LogEntry, RegisteredUser, Slot, UserRole } from "./types";
import { GATE, slotCode } from "./seed";

/*
 * Made-up console data for demos: 30 drivers, a week of gate traffic, and cars parked right now.
 * Deterministic, so every demo looks the same. Replaced by real data once the backend feeds the store.
 */

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const NAMES: [string, UserRole][] = [
  ["Maria Clara Reyes", "student"],
  ["Jose Miguel Santos", "student"],
  ["Angelica Dizon", "student"],
  ["Paolo Villanueva", "student"],
  ["Katrina Mae Lopez", "student"],
  ["Rafael Gutierrez", "student"],
  ["Bianca Montecillo", "student"],
  ["Carlo Jericho Tan", "student"],
  ["Nicole Anne Ramos", "student"],
  ["Jared Patrick Uy", "student"],
  ["Francesca Lim", "student"],
  ["Miguel Angelo Ferrer", "student"],
  ["Hannah Joy Bautista", "student"],
  ["Gabriel Antonio Sy", "student"],
  ["Sofia Isabel Navarro", "student"],
  ["Dr. Elena Maquiling", "personnel"],
  ["Prof. Ricardo Alcantara", "personnel"],
  ["Engr. Teresita Magbanua", "personnel"],
  ["Mr. Domingo Pelayo", "personnel"],
  ["Ms. Lourdes Fernandez", "personnel"],
  ["Mrs. Corazon Jalandoni", "personnel"],
  ["Atty. Benedicto Salcedo", "personnel"],
  ["Dr. Arnold Villaruz", "personnel"],
  ["Mr. Leandro Gonzaga", "personnel"],
  ["Mr. Efren Dumalagan", "personnel"],
  ["Engr. Roberto Ledesma", "personnel"],
  ["Ms. Gloria Consolacion", "personnel"],
  ["Mr. Teodoro Hechanova", "personnel"],
  ["Fr. Alfonso Treñas", "personnel"],
  ["Mr. Ernesto Villanueva", "visitor"],
];

export type SampleData = {
  users: RegisteredUser[];
  slots: Slot[];
  logs: LogEntry[];
  nextLogSeq: number;
  nextUserSeq: number;
};

export function sampleData(config: FloorConfig[], now: number): SampleData {
  let seed = 11;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const users: RegisteredUser[] = NAMES.map(([name, role], i) => {
    const n = i + 1;
    // most passes are current; a few lapsed or are switched off, so the Users page shows every state
    const expiresAt = i === 5 || i === 17 ? now - 2 * DAY : now + (27 - (i % 20)) * DAY;
    return {
      id: `U-${String(n).padStart(3, "0")}`,
      nfcId: `4000-0000-${String(1000 + n)}`,
      studentId: role === "student" ? `2024-${String(10000 + n * 37).slice(-5)}` : role === "personnel" ? `EMP-${String(200 + n)}` : `VIS-${String(n)}`,
      name,
      role,
      active: i !== 11,
      createdAt: expiresAt - 30 * DAY,
      expiresAt,
    };
  });

  // Each driver always parks in the same bay, so two cars never claim one slot. Cars are spread over the floors,
  // since the facilitator picks the floor at the gate.
  const bayFor = new Map<string, { floor: number; code: string }>();
  users.forEach((u, k) => {
    const floor = config[k % config.length];
    bayFor.set(u.id, { floor: floor.floor, code: slotCode(floor.floor, (Math.floor(k / config.length) % floor.slots) + 1) });
  });

  type Visit = { user: RegisteredUser; arrive: number; leave: number };
  const visits: Visit[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  for (let d = 7; d >= 0; d--) {
    const day = today.getTime() - d * DAY;
    if ([0, 6].includes(new Date(day).getDay())) continue;
    for (const u of users) {
      if (!u.active || rand() > 0.82) continue;
      const arrive = day + (7 + rand() * 2.5 + (rand() < 0.12 ? 4 : 0)) * HOUR;
      let leave = arrive + (3.5 + rand() * 6) * HOUR;
      // a few cars are still inside today, so the live view has occupants whatever time it is opened
      if (d === 0 && arrive <= now && leave <= now && Number(u.id.slice(2)) % 3 === 0 && now < day + 21 * HOUR) leave = now + (1 + rand() * 2) * HOUR;
      visits.push({ user: u, arrive, leave });
    }
  }

  const events: Omit<LogEntry, "id">[] = [];
  const occupied = new Map<string, Slot["occupant"]>();
  visits.forEach((v, i) => {
    const bay = bayFor.get(v.user.id)!;
    const base = { gate: GATE, visitId: `V-${String(i + 1).padStart(4, "0")}`, nfcId: v.user.nfcId, userId: v.user.id, userName: v.user.name, slot: bay.code, floor: bay.floor };
    if (v.arrive > now) return;
    events.push({ ...base, at: v.arrive, event: "entry" });
    if (v.leave <= now) events.push({ ...base, at: v.leave, event: "exit" });
    else occupied.set(bay.code, { userId: v.user.id, name: v.user.name, nfcId: v.user.nfcId, since: v.arrive });
  });

  events.sort((a, b) => a.at - b.at);
  const logs: LogEntry[] = events.map((e, i) => ({ ...e, id: `L-${String(i + 1).padStart(4, "0")}` })).reverse();

  const slots: Slot[] = config.flatMap(({ floor, slots: count }) =>
    Array.from({ length: count }, (_, i) => {
      const code = slotCode(floor, i + 1);
      const occupant = occupied.get(code);
      return { code, floor, index: i + 1, status: occupant ? ("occupied" as const) : ("free" as const), ...(occupant ? { occupant } : {}) };
    }),
  );

  // Members who signed up recently and are waiting for the parking office to activate their pass.
  const waiting: [string, UserRole, string][] = [
    ["Isabella Marie Cortez", "student", "isabella.cortez@usa.edu.ph"],
    ["Prof. Anselmo Dimaano", "personnel", "anselmo.dimaano@usa.edu.ph"],
    ["Kyle Matthew Ong", "student", "kyle.ong@usa.edu.ph"],
  ];
  const pending: RegisteredUser[] = waiting.map(([name, role, email], i) => ({
    id: `U-${String(users.length + 1 + i).padStart(3, "0")}`,
    nfcId: `4000-0000-${String(2001 + i)}`,
    studentId: role === "student" ? `2025-${String(20100 + i * 53).slice(-5)}` : `EMP-${String(300 + i)}`,
    email,
    name,
    role,
    active: true,
    createdAt: now - (i + 1) * DAY,
    expiresAt: 0,
  }));
  const everyone = [...users, ...pending];

  return { users: everyone, slots, logs, nextLogSeq: events.length + 1, nextUserSeq: everyone.length + 1 };
}
