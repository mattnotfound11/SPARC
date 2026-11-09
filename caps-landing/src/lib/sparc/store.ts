import { DEFAULT_CONFIG, MAX_SLOTS_PER_FLOOR, buildSlots, slotCode } from "./seed";
import type {
  ActionResult,
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
  nextLogSeq: number;
  nextUserSeq: number;
};

export type SparcStore = {
  getState: () => SparcState;
  subscribe: (listener: () => void) => () => void;
  saveConfig: (next: FloorConfig[]) => ActionResult;
  addUser: (input: UserInput) => ActionResult;
  updateUser: (id: string, input: UserInput) => ActionResult;
  removeUser: (id: string) => ActionResult;
  renewUser: (id: string) => ActionResult;
};

/** Monthly passes run one calendar month from the given moment (Nov 9 → Dec 9). */
export function addOneMonth(ms: number) {
  const d = new Date(ms);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.getTime();
}

const NFC_PATTERN = /^[0-9]+(-[0-9]+)*$/;
const PLATE_PATTERN = /^[A-Z0-9][A-Z0-9 -]{3,9}$/;

export function normalizeNfc(value: string) {
  return value
    .trim()
    .replace(/[^0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePlate(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

export type UserErrors = Partial<Record<keyof UserInput, string>>;

export function validateUser(input: UserInput, users: RegisteredUser[], editingId?: string): UserErrors {
  const errors: UserErrors = {};
  if (input.name.trim().length < 2) errors.name = "Enter the driver's full name.";
  const nfc = normalizeNfc(input.nfcId);
  const nfcDigits = nfc.replace(/-/g, "");
  if (!NFC_PATTERN.test(nfc) || nfcDigits.length < 4 || nfcDigits.length > 20)
    errors.nfcId = "Use numbers only, dashes allowed, like 1234-5678-9012.";
  else if (users.some((u) => u.nfcId === nfc && u.id !== editingId))
    errors.nfcId = "This card is already registered to someone else.";
  if (!PLATE_PATTERN.test(normalizePlate(input.plate))) errors.plate = "Enter a plate such as ABC 1234.";
  return errors;
}

/** One demo record so the "expired pass" flow has something to show on a fresh console. */
function demoExpiredUser(now: number): RegisteredUser {
  const DAY = 24 * 60 * 60 * 1000;
  const expiresAt = now - 3 * DAY; // lapsed 3 days ago
  const createdAt = expiresAt - 30 * DAY; // registered about a month before it lapsed
  return {
    id: "U-DEMO-001",
    nfcId: "1234-5678-9012",
    name: "Juan Dela Cruz (demo)",
    role: "student",
    vehicle: "light",
    plate: "DEMO 1234",
    active: true,
    createdAt,
    expiresAt,
  };
}

export function createSparcStore(now: number = Date.now()): SparcStore {
  const config = DEFAULT_CONFIG.map((f) => ({ ...f }));
  let state: SparcState = {
    now,
    config,
    slots: buildSlots(config),
    users: [demoExpiredUser(now)],
    logs: [],
    nextLogSeq: 1,
    nextUserSeq: 1,
  };
  const listeners = new Set<() => void>();

  function set(patch: Partial<SparcState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
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
      expiresAt: addOneMonth(Date.now()),
    };
    set({ users: [user, ...state.users], nextUserSeq: state.nextUserSeq + 1, now: Date.now() });
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

  function renewUser(id: string): ActionResult {
    const user = state.users.find((u) => u.id === id);
    if (!user) return { ok: false, error: "User not found." };
    const at = Date.now();
    set({
      users: state.users.map((u) => (u.id === id ? { ...u, active: true, expiresAt: addOneMonth(at) } : u)),
      now: at,
    });
    return { ok: true };
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    saveConfig,
    addUser,
    updateUser,
    removeUser,
    renewUser,
  };
}

