import { DEFAULT_CONFIG, buildSlots } from "./seed";
import type {
  ActionResult,
  FloorConfig,
  LogEntry,
  RegisteredUser,
  ScanMode,
  ScanOutcome,
  ScanRecord,
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
  /** Most recent scanner taps, newest first, including rejected ones. */
  scans: ScanRecord[];
  nextLogSeq: number;
  nextScanSeq: number;
  nextUserSeq: number;
};

export type SparcStore = {
  getState: () => SparcState;
  subscribe: (listener: () => void) => () => void;
  addUser: (input: UserInput) => ActionResult;
  updateUser: (id: string, input: UserInput) => ActionResult;
  removeUser: (id: string) => ActionResult;
  renewUser: (id: string) => ActionResult;
  /** A card tap at the entry or exit scanner: does what the mode says, or explains why not. */
  scan: (nfcId: string, mode: ScanMode) => ScanOutcome;
  /** Re-reads saved data, e.g. after another browser tab changed it. Does not write back. */
  refresh: () => void;
};

const MAX_SCANS = 50;

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
/** Web NFC serial: 4 to 10 hex bytes, colon-separated, uppercase. */
const NFC_HEX_PATTERN = /^[0-9A-F]{2}(:[0-9A-F]{2}){3,9}$/;

export function normalizeNfc(value: string) {
  const trimmed = value.trim();
  // iOS Shortcuts "Scan NFC Tag" produces space-separated hex bytes: "04 A1 B2 C3".
  // Colon-separated comes from Web NFC (Android) or manual entry.
  // Both collapse to uppercase colon-separated: 04:A1:B2:C3.
  const hasHexSeparator = trimmed.includes(":") || /^[0-9A-Fa-f]{2}( [0-9A-Fa-f]{2})+$/.test(trimmed);
  if (hasHexSeparator) {
    const bytes = trimmed.toUpperCase().replace(/[^0-9A-F]/g, "").match(/.{2}/g) ?? [];
    return bytes.join(":");
  }
  // Letters without separators are not a valid ID in either format; leave them so validation rejects them.
  if (/[a-z]/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed
    .replace(/[^0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type UserErrors = Partial<Record<keyof UserInput, string>>;

/**
 * One physical card, however its ID was typed: "1234-5678-9012" = "123456789012", "04:a1:b2:c3" = "04 A1 B2 C3".
 * Used for every "is this the same card?" check, so a card can only ever belong to one user.
 */
export function cardKey(value: string) {
  return normalizeNfc(value).replace(/[-:]/g, "");
}

/** "2021 00123 " -> "2021-00123": trimmed, uppercased, spaces become dashes. */
export function normalizeStudentId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

const STUDENT_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,19}$/;

export function validateUser(input: UserInput, users: RegisteredUser[], editingId?: string): UserErrors {
  const errors: UserErrors = {};
  if (input.name.trim().length < 2) errors.name = "Enter the driver's full name.";
  const nfc = normalizeNfc(input.nfcId);
  const nfcDigits = nfc.replace(/-/g, "");
  const validDigits = NFC_PATTERN.test(nfc) && nfcDigits.length >= 4 && nfcDigits.length <= 20;
  if (!validDigits && !NFC_HEX_PATTERN.test(nfc))
    errors.nfcId = "Scan the card, or use numbers like 1234-5678-9012 or hex like 04:A1:B2:C3.";
  else {
    const owner = users.find((u) => cardKey(u.nfcId) === cardKey(nfc) && u.id !== editingId);
    if (owner) errors.nfcId = `This card already belongs to ${owner.name}. One card can only hold one user: remove ${owner.name} first if the card has a new owner.`;
  }
  const sid = normalizeStudentId(input.studentId);
  if (sid && !STUDENT_ID_PATTERN.test(sid)) errors.studentId = "Use 3 to 20 letters, numbers or dashes, like 2021-00123.";
  else if (sid && users.some((u) => (u.studentId ?? "") === sid && u.id !== editingId))
    errors.studentId = "This ID is already registered to someone else.";
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
    studentId: "2021-00123",
    name: "Juan Dela Cruz (demo)",
    role: "student",
    vehicle: "light",
    active: true,
    createdAt,
    expiresAt,
  };
}

/** The bit of `localStorage` the store needs, so tests can pass a fake. */
export type SparcStorage = Pick<Storage, "getItem" | "setItem">;

export const STORAGE_KEY = "sparc:data:v1";

type SavedState = Omit<SparcState, "now">;

function isSaved(d: unknown): d is SavedState {
  if (!d || typeof d !== "object") return false;
  const s = d as Record<string, unknown>;
  return (
    ["config", "slots", "users", "logs", "scans"].every((k) => Array.isArray(s[k])) &&
    ["nextLogSeq", "nextScanSeq", "nextUserSeq"].every((k) => typeof s[k] === "number")
  );
}

function readSaved(storage: SparcStorage | undefined): SavedState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    return isSaved(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * `storage` (the browser's localStorage) makes the data survive a refresh. Without it the store is
 * in-memory only, which is what the tests use.
 */
export function createSparcStore(now: number = Date.now(), storage?: SparcStorage): SparcStore {
  const config = DEFAULT_CONFIG.map((f) => ({ ...f }));
  const saved = readSaved(storage);
  let state: SparcState = saved
    ? { ...saved, now }
    : {
        now,
        config,
        slots: buildSlots(config),
        users: [demoExpiredUser(now)],
        logs: [],
        scans: [],
        nextLogSeq: 1,
        nextScanSeq: 1,
        nextUserSeq: 1,
      };
  const listeners = new Set<() => void>();

  function persist() {
    if (!storage) return;
    const { now: _now, ...data } = state;
    void _now;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full or blocked (private mode): keep working in memory
    }
  }
  if (!saved) persist(); // the first run saves the seed, so removing the demo user sticks

  function set(patch: Partial<SparcState>) {
    state = { ...state, ...patch };
    persist();
    listeners.forEach((l) => l());
  }

  function refresh() {
    const latest = readSaved(storage);
    if (!latest) return;
    state = { ...latest, now: Date.now() };
    listeners.forEach((l) => l());
  }

  function addUser(input: UserInput): ActionResult {
    const errors = validateUser(input, state.users);
    const first = Object.values(errors)[0];
    if (first) return { ok: false, error: first };
    const user: RegisteredUser = {
      id: `U-${String(state.nextUserSeq).padStart(3, "0")}`,
      nfcId: normalizeNfc(input.nfcId),
      studentId: normalizeStudentId(input.studentId),
      name: input.name.trim(),
      role: input.role,
      vehicle: input.vehicle,
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
              studentId: normalizeStudentId(input.studentId),
              role: input.role,
              vehicle: input.vehicle,
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

  function scan(rawNfc: string, mode: ScanMode): ScanOutcome {
    const at = Date.now();
    const nfcId = normalizeNfc(rawNfc);
    const user = state.users.find((u) => cardKey(u.nfcId) === cardKey(nfcId));

    function record(outcome: ScanOutcome, patch: Partial<SparcState> = {}): ScanOutcome {
      const row: ScanRecord = { id: `S-${state.nextScanSeq}`, at, nfcId, outcome };
      set({ ...patch, scans: [row, ...state.scans].slice(0, MAX_SCANS), nextScanSeq: state.nextScanSeq + 1, now: at });
      return outcome;
    }

    if (!user) return record({ status: "unregistered", nfcId });

    const parked = state.slots.find((s) => s.occupant?.userId === user.id);
    if (parked && mode === "entry") return record({ status: "already-inside", user, slot: parked.code, floor: parked.floor });
    if (!parked && mode === "exit") return record({ status: "not-inside", user });
    if (parked) {
      // Leaving is always allowed, even if the pass lapsed while parked.
      const entry = state.logs.find((l) => l.event === "entry" && l.userId === user.id);
      const log: LogEntry = {
        id: `L-${String(state.nextLogSeq).padStart(4, "0")}`,
        visitId: entry?.visitId ?? null,
        at,
        event: "exit",
        nfcId: user.nfcId,
        userId: user.id,
        userName: user.name,
        slot: parked.code,
        floor: parked.floor,
        vehicle: parked.vehicle,
      };
      return record(
        { status: "exited", user, slot: parked.code, floor: parked.floor },
        {
          slots: state.slots.map((s) => (s.code === parked.code ? { ...s, status: "free", occupant: undefined } : s)),
          logs: [log, ...state.logs],
          nextLogSeq: state.nextLogSeq + 1,
        },
      );
    }

    if (!user.active) return record({ status: "no-pass", user });
    if (user.expiresAt <= at) return record({ status: "expired", user });

    const free = state.slots.find((s) => s.status === "free" && s.vehicle === user.vehicle);
    if (!free) return record({ status: "full", user });

    const seq = state.nextLogSeq;
    const log: LogEntry = {
      id: `L-${String(seq).padStart(4, "0")}`,
      visitId: `V-${String(seq).padStart(4, "0")}`,
      at,
      event: "entry",
      nfcId: user.nfcId,
      userId: user.id,
      userName: user.name,
      slot: free.code,
      floor: free.floor,
      vehicle: free.vehicle,
    };
    return record(
      { status: "entered", user, slot: free.code, floor: free.floor },
      {
        slots: state.slots.map((s) =>
          s.code === free.code
            ? { ...s, status: "occupied", occupant: { userId: user.id, name: user.name, nfcId: user.nfcId, since: at } }
            : s,
        ),
        logs: [log, ...state.logs],
        nextLogSeq: seq + 1,
      },
    );
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    addUser,
    updateUser,
    removeUser,
    renewUser,
    scan,
    refresh,
  };
}

