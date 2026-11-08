import { MAX_SLOTS_PER_FLOOR, createSeed, randomNfcId, slotCode } from "./seed";
import type {
  ActionResult,
  Alert,
  FloorConfig,
  LogEntry,
  RegisteredUser,
  Slot,
  UserInput,
} from "./types";

/*
 * The console's data layer. The UI only talks to this store, so swapping the
 * in-memory prototype for a real API (Supabase, the ESP8266 gateway, …) means
 * reimplementing these methods, not touching the views.
 */

export type SparcState = {
  /** Time of the last change. Views use it to age relative timestamps. */
  now: number;
  config: FloorConfig[];
  slots: Slot[];
  users: RegisteredUser[];
  logs: LogEntry[];
  alerts: Alert[];
  /** Simulated gate feed on/off. */
  live: boolean;
  nextLogSeq: number;
  nextUserSeq: number;
};

export type SparcStore = {
  getState: () => SparcState;
  subscribe: (listener: () => void) => () => void;
  tick: () => void;
  setLive: (live: boolean) => void;
  saveConfig: (next: FloorConfig[]) => ActionResult;
  addUser: (input: UserInput) => ActionResult;
  updateUser: (id: string, input: UserInput) => ActionResult;
  removeUser: (id: string) => ActionResult;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAllAlerts: () => void;
};

const NFC_PATTERN = /^[0-9A-F]{2}(:[0-9A-F]{2}){3}$/;
const PLATE_PATTERN = /^[A-Z0-9][A-Z0-9 -]{3,9}$/;

export function normalizeNfc(value: string) {
  const hex = value.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  if (hex.length === 8) return hex.match(/.{2}/g)!.join(":");
  return value.trim().toUpperCase();
}

export function normalizePlate(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

export type UserErrors = Partial<Record<keyof UserInput, string>>;

export function validateUser(input: UserInput, users: RegisteredUser[], editingId?: string): UserErrors {
  const errors: UserErrors = {};
  if (input.name.trim().length < 2) errors.name = "Enter the driver's full name.";
  const nfc = normalizeNfc(input.nfcId);
  if (!NFC_PATTERN.test(nfc)) errors.nfcId = "Use four hex bytes, like 04:A3:5F:1B.";
  else if (users.some((u) => u.nfcId === nfc && u.id !== editingId))
    errors.nfcId = "This card is already registered to someone else.";
  if (!PLATE_PATTERN.test(normalizePlate(input.plate))) errors.plate = "Enter a plate such as ABC 1234.";
  return errors;
}

export function createSparcStore(now: number = Date.now()): SparcStore {
  const seed = createSeed(now);
  let state: SparcState = {
    now,
    config: seed.config,
    slots: seed.slots,
    users: seed.users,
    logs: seed.logs,
    alerts: seed.alerts,
    live: true,
    nextLogSeq: seed.nextLogSeq,
    nextUserSeq: seed.users.length + 1,
  };
  const listeners = new Set<() => void>();

  function set(patch: Partial<SparcState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  }

  const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

  function logEntry(seq: number, entry: Omit<LogEntry, "id">): LogEntry {
    return { ...entry, id: `L-${String(seq).padStart(5, "0")}` };
  }

  /** One simulated gate event: an arrival, a departure or a tap from an unknown card. */
  function tick() {
    const at = Date.now();
    let slots = state.slots;
    let logs = state.logs;
    let alerts = state.alerts;
    let seq = state.nextLogSeq;

    // A reserved slot becomes occupied once the car reaches it.
    if (slots.some((s) => s.status === "reserved")) {
      slots = slots.map((s) => (s.status === "reserved" ? { ...s, status: "occupied" as const } : s));
    }

    const r = Math.random();
    const inside = new Set(slots.filter((s) => s.occupant).map((s) => s.occupant!.userId));

    if (r < 0.46) {
      // arrival
      const candidates = state.users.filter((u) => u.active && !inside.has(u.id));
      const user = candidates.length ? pick(candidates) : null;
      const open = user ? slots.filter((s) => s.status === "free" && s.vehicle === user.vehicle) : [];
      if (user && open.length) {
        const slot = pick(open);
        slots = slots.map((s) =>
          s.code === slot.code
            ? {
                ...s,
                status: "reserved" as const,
                occupant: { userId: user.id, name: user.name, plate: user.plate, nfcId: user.nfcId, since: at },
              }
            : s,
        );
        logs = [
          logEntry(seq++, {
            visitId: `V-live-${seq}`,
            at,
            event: "entry",
            nfcId: user.nfcId,
            userId: user.id,
            userName: user.name,
            slot: slot.code,
            floor: slot.floor,
            vehicle: user.vehicle,
            result: "granted",
          }),
          ...logs,
        ];
      }
    } else if (r < 0.82) {
      // departure
      const leaving = slots.filter((s) => s.status === "occupied" && s.occupant && at - s.occupant.since > 2 * 60_000);
      if (leaving.length) {
        const slot = pick(leaving);
        const occ = slot.occupant!;
        const entry = logs.find((l) => l.event === "entry" && l.slot === slot.code && l.userId === occ.userId);
        slots = slots.map((s) => (s.code === slot.code ? { ...s, status: "free" as const, occupant: undefined } : s));
        logs = [
          logEntry(seq++, {
            visitId: entry?.visitId ?? null,
            at,
            event: "exit",
            nfcId: occ.nfcId,
            userId: occ.userId,
            userName: occ.name,
            slot: slot.code,
            floor: slot.floor,
            vehicle: slot.vehicle,
            result: "granted",
          }),
          ...logs,
        ];
      }
    } else {
      // tap from a card that is not on the registry
      const known = new Set(state.users.map((u) => u.nfcId));
      let nfcId = randomNfcId();
      while (known.has(nfcId)) nfcId = randomNfcId();
      const entry = logEntry(seq++, {
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
      logs = [entry, ...logs];
      alerts = [{ id: `A-${entry.id}`, at, nfcId, acknowledged: false }, ...alerts];
    }

    set({ now: at, slots, logs, alerts, nextLogSeq: seq });
  }

  function saveConfig(next: FloorConfig[]): ActionResult {
    const slots = state.slots;
    for (const f of next) {
      if (!Number.isInteger(f.slots) || f.slots < 1 || f.slots > MAX_SLOTS_PER_FLOOR)
        return { ok: false, error: `Floor ${f.floor}: enter between 1 and ${MAX_SLOTS_PER_FLOOR} slots.` };
      const current = state.config.find((c) => c.floor === f.floor);
      const inUse = slots.filter((s) => s.floor === f.floor && s.status !== "free");
      if (current && current.vehicle !== f.vehicle && inUse.length)
        return { ok: false, error: `Floor ${f.floor} has ${inUse.length} vehicle(s) in it. Change its type once they leave.` };
      const blocked = inUse.find((s) => s.index > f.slots);
      if (blocked) return { ok: false, error: `Slot ${blocked.code} is in use, so floor ${f.floor} can't shrink below ${blocked.index}.` };
    }

    const rebuilt: Slot[] = [];
    for (const f of next) {
      const existing = slots.filter((s) => s.floor === f.floor && s.index <= f.slots);
      const byIndex = new Map(existing.map((s) => [s.index, s]));
      for (let i = 1; i <= f.slots; i++) {
        const keep = byIndex.get(i);
        rebuilt.push(
          keep
            ? { ...keep, vehicle: f.vehicle }
            : { code: slotCode(f.floor, i), floor: f.floor, index: i, vehicle: f.vehicle, status: "free" },
        );
      }
    }
    set({ config: next.map((f) => ({ ...f })), slots: rebuilt, now: Date.now() });
    return { ok: true };
  }

  function addUser(input: UserInput): ActionResult {
    const errors = validateUser(input, state.users);
    const first = Object.values(errors)[0];
    if (first) return { ok: false, error: first };
    const user: RegisteredUser = {
      id: `U-${String(state.nextUserSeq).padStart(3, "0")}`,
      nfcId: normalizeNfc(input.nfcId),
      name: input.name.trim(),
      role: input.role,
      vehicle: input.vehicle,
      plate: normalizePlate(input.plate),
      active: input.active,
      createdAt: Date.now(),
    };
    // Registering a card that was just flagged clears its alert.
    const alerts = state.alerts.map((a) => (a.nfcId === user.nfcId ? { ...a, acknowledged: true } : a));
    set({ users: [user, ...state.users], alerts, nextUserSeq: state.nextUserSeq + 1, now: Date.now() });
    return { ok: true };
  }

  function updateUser(id: string, input: UserInput): ActionResult {
    const errors = validateUser(input, state.users, id);
    const first = Object.values(errors)[0];
    if (first) return { ok: false, error: first };
    set({
      users: state.users.map((u) =>
        u.id === id
          ? {
              ...u,
              name: input.name.trim(),
              nfcId: normalizeNfc(input.nfcId),
              role: input.role,
              vehicle: input.vehicle,
              plate: normalizePlate(input.plate),
              active: input.active,
            }
          : u,
      ),
      now: Date.now(),
    });
    return { ok: true };
  }

  function removeUser(id: string): ActionResult {
    const parked = state.slots.find((s) => s.occupant?.userId === id);
    if (parked) return { ok: false, error: `Parked in ${parked.code} right now. Remove them after they exit.` };
    set({ users: state.users.filter((u) => u.id !== id), now: Date.now() });
    return { ok: true };
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    tick,
    setLive: (live) => set({ live }),
    saveConfig,
    addUser,
    updateUser,
    removeUser,
    acknowledgeAlert: (id) => set({ alerts: state.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)) }),
    acknowledgeAllAlerts: () => set({ alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })) }),
  };
}

