import { DEFAULT_CONFIG, GATE, buildSlots } from "./seed";
import { sampleData } from "./sample";
import { pickFreeSlot } from "./selectors";
import { cardKey, normalizeNfc, validateCardFormat } from "./card";
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
  /** Renews a pass to `expiresAt`, the end of the semester it is for (the caller works that out from the semester dates). */
  renewUser: (id: string, expiresAt: number) => ActionResult;
  /** Registers a visitor NFC card the office hands out. Its built-in role is Visitor, so a tap shows 'Visitor' and needs no semester pass. */
  addVisitorCard: (nfcId: string, label?: string) => ActionResult;
  /** Starts a pending member's pass: gives them the card and runs the pass to `expiresAt`, the end of a semester. */
  activateUser: (id: string, nfcId: string, expiresAt: number) => ActionResult;
  /**
   * A card tap at the entry or exit scanner: does what the mode says, or explains why not.
   * At entry the first tap only checks the pass and answers `needs-floor`; the facilitator then picks a
   * floor and the same call is repeated with `floor`, which books the first free bay there.
   * `walkIn: true` is the facilitator confirming a receipt for a card nobody registered: it lets that card
   * in as a "Walk-in" (and the same card is recognised at exit). It never applies to a registered card,
   * so it can't be used to get around a member's pass.
   */
  scan: (nfcId: string, mode: ScanMode, options?: ScanOptions) => ScanOutcome;
  /** Re-reads saved data, e.g. after another browser tab changed it. Does not write back. */
  refresh: () => void;
  /**
   * Replaces the synced tables with what the shared database holds. A store fed this way must be
   * created with `newId: uniqueId`, since several devices write to the same tables.
   */
  hydrate: (data: HydrateData) => void;
  /** A visitor's pass was accepted: log the entry against the host's card. The guest goes to visitor parking, so no bay is taken. */
  logVisitorEntry: (hostNfcId: string, guestName: string, plate: string, gate?: string) => void;
  /** Demo only: replaces the console's data with made-up drivers, a week of traffic and cars parked now. */
  loadSample: () => void;
};

export type ScanOptions = { gate?: string; floor?: number; walkIn?: boolean };

/** Name shown for, and recorded against, a driver who paid at the gate with a card nobody registered. */
export const WALK_IN_NAME = "Walk-in";
const WALK_IN_PREFIX = "walk-in:";

export type HydrateData = Pick<SparcState, "slots" | "users" | "logs" | "scans">;

export type StoreOptions = {
  /**
   * Makes record ids. Default: readable per-browser counters (U-001, L-0001, S-1). With a shared
   * database every device must make ids that can't collide; pass `uniqueId`.
   */
  newId?: (prefix: "U" | "L" | "V" | "S") => string;
};

/** An id no other device will produce: creation time plus 8 random characters, e.g. "L-MHX3K2P17QF9Z2AB". */
export function uniqueId(prefix: string) {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join("");
  return `${prefix}-${Date.now().toString(36)}${random}`.toUpperCase();
}

const MAX_SCANS = 50;

/**
 * How long a pass lasts when a user is added straight into the store (development seeding and tests only).
 * Real passes run to the end of a semester: the screens work that out from the semester dates.
 */
const SEED_PASS_MS = 120 * 24 * 60 * 60 * 1000;

// Kept here so existing imports keep working; the card helpers live in ./card so sign-up can use them too.
export { cardKey, normalizeNfc };

export type UserErrors = Partial<Record<keyof UserInput, string>>;


/** "2021 00123 " -> "2021-00123": trimmed, uppercased, spaces become dashes. */
export function normalizeStudentId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

const STUDENT_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,19}$/;

/** An error message when the card can't be given to this user, or undefined when it can. */
export function validateCard(nfcId: string, users: RegisteredUser[], editingId?: string): string | undefined {
  const formatError = validateCardFormat(nfcId);
  if (formatError) return formatError;
  const owner = users.find((u) => u.nfcId && cardKey(u.nfcId) === cardKey(nfcId) && u.id !== editingId);
  if (owner) return `This card already belongs to ${owner.name}. One card can only hold one user: remove ${owner.name} first if the card has a new owner.`;
  return undefined;
}

/** A blank card is allowed: that is a Pending member, who gets their card when the pass is activated. */
export function validateUser(input: UserInput, users: RegisteredUser[], editingId?: string): UserErrors {
  const errors: UserErrors = {};
  if (input.name.trim().length < 2) errors.name = "Enter the driver's full name.";
  if (input.nfcId.trim()) {
    const cardError = validateCard(input.nfcId, users, editingId);
    if (cardError) errors.nfcId = cardError;
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
    active: true,
    createdAt,
    expiresAt,
  };
}

/** The bit of `localStorage` the store needs, so tests can pass a fake. */
export type SparcStorage = Pick<Storage, "getItem" | "setItem">;

const VISITOR_CARD_MS = 10 * 365 * 24 * 60 * 60 * 1000;

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
export function createSparcStore(now: number = Date.now(), storage?: SparcStorage, { newId }: StoreOptions = {}): SparcStore {
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
    const hasCard = input.nfcId.trim() !== "";
    const user: RegisteredUser = {
      id: newId?.("U") ?? `U-${String(state.nextUserSeq).padStart(3, "0")}`,
      nfcId: hasCard ? normalizeNfc(input.nfcId) : "",
      studentId: normalizeStudentId(input.studentId),
      ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
      name: input.name.trim(),
      role: input.role,
      active: input.active,
      createdAt: Date.now(),
      // No card means no pass yet: the member is Pending until the parking office activates it.
      expiresAt: hasCard ? Date.now() + SEED_PASS_MS : 0,
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
              nfcId: input.nfcId.trim() ? normalizeNfc(input.nfcId) : "",
              studentId: normalizeStudentId(input.studentId),
              role: input.role,
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

  function addVisitorCard(rawNfc: string, label = ""): ActionResult {
    const cardError = validateCard(rawNfc, state.users);
    if (cardError) return { ok: false, error: cardError };
    const at = Date.now();
    const count = state.users.filter((u) => u.role === "visitor").length + 1;
    const name = label.trim() || `Visitor ${String(count).padStart(2, "0")}`;
    const card: RegisteredUser = {
      id: newId?.("U") ?? `U-${String(state.nextUserSeq).padStart(3, "0")}`,
      nfcId: normalizeNfc(rawNfc),
      name,
      role: "visitor",
      active: true,
      createdAt: at,
      // A visitor card never lapses by date; this far-off end date only satisfies the table.
      expiresAt: at + VISITOR_CARD_MS,
    };
    set({ users: [card, ...state.users], nextUserSeq: state.nextUserSeq + 1, now: at });
    return { ok: true };
  }

  function renewUser(id: string, expiresAt: number): ActionResult {
    const user = state.users.find((u) => u.id === id);
    if (!user) return { ok: false, error: "User not found." };
    const at = Date.now();
    if (!(expiresAt > at)) return { ok: false, error: "The pass end date has to be in the future. Check the semester dates." };
    set({
      users: state.users.map((u) => (u.id === id ? { ...u, active: true, expiresAt } : u)),
      now: at,
    });
    return { ok: true };
  }

  function activateUser(id: string, rawNfc: string, expiresAt: number): ActionResult {
    const user = state.users.find((u) => u.id === id);
    if (!user) return { ok: false, error: "User not found." };
    const cardError = validateCard(rawNfc, state.users, id);
    if (cardError) return { ok: false, error: cardError };
    const at = Date.now();
    if (!(expiresAt > at)) return { ok: false, error: "The pass end date has to be in the future. Check the semester dates." };
    set({
      users: state.users.map((u) => (u.id === id ? { ...u, nfcId: normalizeNfc(rawNfc), active: true, expiresAt } : u)),
      now: at,
    });
    return { ok: true };
  }

  function scan(rawNfc: string, mode: ScanMode, { gate = GATE, floor, walkIn = false }: ScanOptions = {}): ScanOutcome {
    const at = Date.now();
    const nfcId = normalizeNfc(rawNfc);
    const key = cardKey(nfcId);
    // A pending member has no card yet, and a blank scan must never match them.
    const member = key ? state.users.find((u) => u.nfcId && cardKey(u.nfcId) === key) : undefined;
    // An unregistered card is a walk-in only if it is already parked as one, or the facilitator confirmed it
    // at entry. A registered card is never a walk-in, so its pass is always checked.
    const parkedWalkIn = !member && key ? state.slots.find((s) => s.occupant?.userId.startsWith(WALK_IN_PREFIX) && cardKey(s.occupant.nfcId) === key) : undefined;
    const isGuest = !member && key !== "" && (parkedWalkIn !== undefined || (mode === "entry" && walkIn));
    // A stand-in record so the scanner's screens can show the walk-in. It is never saved in `users`.
    const guest: RegisteredUser = { id: `${WALK_IN_PREFIX}${key}`, nfcId, name: WALK_IN_NAME, role: "visitor", active: true, createdAt: at, expiresAt: at };
    const user = member ?? (isGuest ? guest : undefined);
    const tag = isGuest ? { walkIn: true as const } : {};

    function record(outcome: ScanOutcome, patch: Partial<SparcState> = {}): ScanOutcome {
      const row: ScanRecord = { id: newId?.("S") ?? `S-${state.nextScanSeq}`, at, nfcId, outcome };
      set({ ...patch, scans: [row, ...state.scans].slice(0, MAX_SCANS), nextScanSeq: state.nextScanSeq + 1, now: at });
      return outcome;
    }

    if (!user) return record({ status: "unregistered", nfcId });

    const parked = state.slots.find((s) => s.occupant?.userId === user.id);
    if (parked && mode === "entry") return record({ status: "already-inside", user, slot: parked.code, floor: parked.floor, ...tag });
    if (!parked && mode === "exit") return record({ status: "not-inside", user });
    if (parked) {
      // Leaving is always allowed, even if the pass lapsed while parked.
      const entry = state.logs.find((l) => l.event === "entry" && (isGuest ? l.userId === null && cardKey(l.nfcId) === key : l.userId === user.id));
      const log: LogEntry = {
        id: newId?.("L") ?? `L-${String(state.nextLogSeq).padStart(4, "0")}`,
        visitId: entry?.visitId ?? null,
        at,
        event: "exit",
        nfcId: user.nfcId,
        userId: isGuest ? null : user.id,
        userName: user.name,
        slot: parked.code,
        floor: parked.floor,
        gate,
      };
      return record(
        { status: "exited", user, slot: parked.code, floor: parked.floor, ...tag },
        {
          slots: state.slots.map((s) => (s.code === parked.code ? { ...s, status: "free", occupant: undefined } : s)),
          logs: [log, ...state.logs],
          nextLogSeq: state.nextLogSeq + 1,
        },
      );
    }

    if (!isGuest) {
      if (!user.active || user.expiresAt === 0) return record({ status: "no-pass", user });
      // A visitor card has no semester: it is good until the office switches it off.
      if (user.role !== "visitor" && user.expiresAt <= at) return record({ status: "expired", user });
    }

    // The card is good. Which floor the car goes to is the facilitator's call, so ask before booking anything.
    if (floor === undefined) return { status: "needs-floor", user, ...tag };

    const free = pickFreeSlot(state.config, state.slots, floor, at);
    if (!free) return record({ status: "full", user, ...tag });

    const seq = state.nextLogSeq;
    const log: LogEntry = {
      id: newId?.("L") ?? `L-${String(seq).padStart(4, "0")}`,
      visitId: newId?.("V") ?? `V-${String(seq).padStart(4, "0")}`,
      at,
      event: "entry",
      nfcId: user.nfcId,
      userId: isGuest ? null : user.id,
      userName: user.name,
      slot: free.code,
      floor: free.floor,
      gate,
    };
    return record(
      { status: "entered", user, slot: free.code, floor: free.floor, ...tag },
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
    addVisitorCard,
    activateUser,
    scan,
    refresh,
    hydrate: (data) => set({ ...data, now: Date.now() }),
    logVisitorEntry(hostNfcId, guestName, plate, gate = GATE) {
      const at = Date.now();
      const host = state.users.find((u) => cardKey(u.nfcId) === cardKey(hostNfcId));
      const seq = state.nextLogSeq;
      const log: LogEntry = {
        id: newId?.("L") ?? `L-${String(seq).padStart(4, "0")}`,
        visitId: newId?.("V") ?? `V-${String(seq).padStart(4, "0")}`,
        at,
        event: "entry",
        nfcId: host?.nfcId ?? normalizeNfc(hostNfcId),
        userId: host?.id ?? null,
        userName: `Visitor ${guestName} (${plate}), host ${host?.name ?? "unknown"}`,
        slot: null,
        floor: null,
        gate,
      };
      set({ logs: [log, ...state.logs], nextLogSeq: seq + 1, now: at });
    },
    loadSample() {
      const at = Date.now();
      const sample = sampleData(state.config, at);
      // keep the built-in demo user (the expired-pass example) alongside the sample drivers
      const kept = state.users.filter((u) => u.id === "U-DEMO-001");
      let { slots, logs, nextLogSeq } = sample;
      // The demo driver is parked right now, so the driver portal's "My parking" page has something to show
      const demo = kept[0];
      const bay = slots.find((s) => s.code === "E1" && s.status === "free");
      if (demo && bay) {
        const since = at - 2.5 * 60 * 60 * 1000;
        const n = String(nextLogSeq).padStart(4, "0");
        slots = slots.map((s) => (s.code === bay.code ? { ...s, status: "occupied" as const, occupant: { userId: demo.id, name: demo.name, nfcId: demo.nfcId, since } } : s));
        const entry: LogEntry = { id: `L-${n}`, visitId: `V-${n}`, at: since, event: "entry", nfcId: demo.nfcId, userId: demo.id, userName: demo.name, slot: bay.code, floor: bay.floor, gate: GATE };
        logs = [entry, ...logs].sort((a, b) => b.at - a.at);
        nextLogSeq++;
      }
      set({ ...sample, slots, logs, nextLogSeq, users: [...sample.users, ...kept], scans: [], nextScanSeq: 1, now: at });
    },
  };
}

