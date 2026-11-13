import type { SupabaseClient } from "@supabase/supabase-js";
import { startOfDay } from "@/lib/sparc/seed";
import type { HydrateData, SparcState, SparcStore } from "@/lib/sparc/store";
import type { LogEntry, RegisteredUser, ScanRecord, Slot } from "@/lib/sparc/types";

/* Maps the app's camelCase objects to the snake_case rows in supabase/schema.sql, and keeps a
 * SparcStore in step with the database in both directions. */

/** Logs are downloaded for this many days back (Reports' date picker can reach that far). */
export const LOG_DAYS = 30;
/** Safety cap on the log download. */
export const LOG_LIMIT = 2000;
/** Matches the store's own cap on the recent-scans list. */
export const SCAN_LIMIT = 50;
/** If live updates can't connect (some networks block websockets), load the data anyway after this. */
const FALLBACK_LOAD_MS = 2500;
/** Live updates not connected after this long counts as disconnected (the screen may fall behind). */
const LIVE_GRACE_MS = 10000;

type Row = Record<string, unknown>;

export const userToRow = (u: RegisteredUser): Row => ({
  id: u.id,
  nfc_id: u.nfcId,
  student_id: u.studentId || null,
  name: u.name,
  role: u.role,
  vehicle: u.vehicle,
  active: u.active,
  created_at: u.createdAt,
  expires_at: u.expiresAt,
});

export const userFromRow = (r: Row): RegisteredUser => ({
  id: r.id as string,
  nfcId: r.nfc_id as string,
  ...(r.student_id ? { studentId: String(r.student_id) } : {}),
  name: r.name as string,
  role: r.role as RegisteredUser["role"],
  vehicle: r.vehicle as RegisteredUser["vehicle"],
  active: Boolean(r.active),
  createdAt: Number(r.created_at),
  expiresAt: Number(r.expires_at),
});

export const slotToRow = (s: Slot): Row => ({
  code: s.code,
  floor: s.floor,
  idx: s.index,
  vehicle: s.vehicle,
  status: s.status,
  occupant_user_id: s.occupant?.userId ?? null,
  occupant_name: s.occupant?.name ?? null,
  occupant_nfc: s.occupant?.nfcId ?? null,
  occupant_since: s.occupant?.since ?? null,
});

export const slotFromRow = (r: Row): Slot => ({
  code: r.code as string,
  floor: Number(r.floor),
  index: Number(r.idx),
  vehicle: r.vehicle as Slot["vehicle"],
  status: r.status as Slot["status"],
  ...(r.status === "occupied" && r.occupant_user_id
    ? {
        occupant: {
          userId: r.occupant_user_id as string,
          name: r.occupant_name as string,
          nfcId: r.occupant_nfc as string,
          since: Number(r.occupant_since),
        },
      }
    : {}),
});

export const logToRow = (l: LogEntry): Row => ({
  id: l.id,
  visit_id: l.visitId,
  at: l.at,
  event: l.event,
  nfc_id: l.nfcId,
  user_id: l.userId,
  user_name: l.userName,
  slot: l.slot,
  floor: l.floor,
  vehicle: l.vehicle,
});

export const logFromRow = (r: Row): LogEntry => ({
  id: r.id as string,
  visitId: (r.visit_id as string | null) ?? null,
  at: Number(r.at),
  event: r.event as LogEntry["event"],
  nfcId: r.nfc_id as string,
  userId: (r.user_id as string | null) ?? null,
  userName: (r.user_name as string | null) ?? null,
  slot: (r.slot as string | null) ?? null,
  floor: r.floor == null ? null : Number(r.floor),
  vehicle: (r.vehicle as LogEntry["vehicle"]) ?? null,
});

export const scanToRow = (s: ScanRecord): Row => ({ id: s.id, at: s.at, nfc_id: s.nfcId, outcome: s.outcome });

export const scanFromRow = (r: Row): ScanRecord => ({
  id: r.id as string,
  at: Number(r.at),
  nfcId: r.nfc_id as string,
  outcome: r.outcome as ScanRecord["outcome"],
});

const bySlot = (a: Slot, b: Slot) => a.floor - b.floor || a.index - b.index;
const newestFirst = (a: { at: number }, b: { at: number }) => b.at - a.at;

/** Start of the oldest day whose logs are downloaded. */
export function historyStart(now: number) {
  const d = new Date(startOfDay(now));
  d.setDate(d.getDate() - (LOG_DAYS - 1));
  return d.getTime();
}

/** Reads every synced table. Throws on the first error so callers keep their current state. */
export async function fetchAll(db: SupabaseClient, now: number = Date.now()): Promise<HydrateData> {
  const [users, slots, logs, scans] = await Promise.all([
    db.from("users").select("*").order("created_at", { ascending: false }),
    db.from("slots").select("*"),
    db.from("logs").select("*").gte("at", historyStart(now)).order("at", { ascending: false }).limit(LOG_LIMIT),
    db.from("scans").select("*").order("at", { ascending: false }).limit(SCAN_LIMIT),
  ]);
  for (const res of [users, slots, logs, scans]) if (res.error) throw res.error;
  return {
    users: (users.data as Row[]).map(userFromRow),
    slots: (slots.data as Row[]).map(slotFromRow).sort(bySlot),
    logs: (logs.data as Row[]).map(logFromRow),
    scans: (scans.data as Row[]).map(scanFromRow),
  };
}

/** One row change as delivered by Supabase Realtime. */
export type Change = {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Row;
  old: Row;
};

/** Replaces the item with the same key, or adds it. Unchanged items keep their identity. */
function upsert<T>(list: T[], item: T, key: (t: T) => string): T[] {
  const k = key(item);
  return list.some((x) => key(x) === k) ? list.map((x) => (key(x) === k ? item : x)) : [item, ...list];
}

/**
 * Applies a single realtime change to the synced data. Pure and idempotent (applying the same
 * change twice gives the same result), so a change that a full reload already included is harmless.
 */
export function applyChange(data: HydrateData, change: Change): HydrateData {
  const removed = change.eventType === "DELETE";
  const row = removed ? change.old : change.new;
  switch (change.table) {
    case "users": {
      if (removed) return { ...data, users: data.users.filter((u) => u.id !== row.id) };
      return { ...data, users: upsert(data.users, userFromRow(row), (u) => u.id) };
    }
    case "slots": {
      if (removed) return { ...data, slots: data.slots.filter((s) => s.code !== row.code) };
      return { ...data, slots: upsert(data.slots, slotFromRow(row), (s) => s.code).sort(bySlot) };
    }
    case "logs": {
      if (removed) return { ...data, logs: data.logs.filter((l) => l.id !== row.id) };
      return { ...data, logs: upsert(data.logs, logFromRow(row), (l) => l.id).sort(newestFirst).slice(0, LOG_LIMIT) };
    }
    case "scans": {
      if (removed) return { ...data, scans: data.scans.filter((s) => s.id !== row.id) };
      return { ...data, scans: upsert(data.scans, scanFromRow(row), (s) => s.id).sort(newestFirst).slice(0, SCAN_LIMIT) };
    }
    default:
      return data;
  }
}

/** What changed between two states, as database operations. Pure, so it is unit-tested. */
export function diffState(prev: SparcState, next: SparcState) {
  const prevUsers = new Map(prev.users.map((u) => [u.id, u]));
  const nextUserIds = new Set(next.users.map((u) => u.id));
  const prevSlots = new Map(prev.slots.map((s) => [s.code, s]));
  const prevLogIds = new Set(prev.logs.map((l) => l.id));
  const prevScanIds = new Set(prev.scans.map((s) => s.id));
  const changedSlots = next.slots.filter((s) => prevSlots.get(s.code) !== s);
  return {
    upsertUsers: next.users.filter((u) => prevUsers.get(u.id) !== u),
    deleteUserIds: prev.users.filter((u) => !nextUserIds.has(u.id)).map((u) => u.id),
    /** Each changed slot with how this device last saw it, so the database can refuse a stale write. */
    slotChanges: changedSlots.map((slot) => ({ slot, before: prevSlots.get(slot.code) ?? null })),
    newLogs: next.logs.filter((l) => !prevLogIds.has(l.id)),
    newScans: next.scans.filter((s) => !prevScanIds.has(s.id)),
  };
}

/**
 * The database arguments for one gate tap (see `record_tap` in supabase/schema.sql): the scan row,
 * plus the log row and slot change when the tap let a vehicle in or out.
 */
export function tapArgs(d: ReturnType<typeof diffState>) {
  const [scan] = d.newScans;
  const [log] = d.newLogs;
  const [change] = d.slotChanges;
  return {
    p_scan: scanToRow(scan),
    p_log: log ? logToRow(log) : null,
    p_slot: change ? slotToRow(change.slot) : null,
    p_slot_before: change ? { status: change.before?.status ?? "free", occupant_user_id: change.before?.occupant?.userId ?? null } : null,
  };
}

const pick = ({ users, slots, logs, scans }: SparcState): HydrateData => ({ users, slots, logs, scans });

/** Supabase errors are plain objects with a `message`, not Error instances. */
export function errorText(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

/**
 * Connects a store to Supabase: loads the current data, pushes local changes, and applies each
 * change another device makes as it happens (one row, not a full reload, to keep mobile data low).
 * Returns a stop function.
 */
export function startSync(
  store: SparcStore,
  db: SupabaseClient,
  {
    onProblem = () => {},
    onLoaded = () => {},
    onLiveChange = () => {},
  }: {
    /** A message for the admin when a load or save fails; null again after the next one succeeds. */
    onProblem?: (message: string | null) => void;
    onLoaded?: () => void;
    onLiveChange?: (live: boolean) => void;
  } = {},
) {
  let stopped = false;
  let loadRequested = false; // a full load is queued or done, so the fallback timer has nothing to do
  let last = store.getState();
  let applying = false; // true while writing database data into the store: don't push it back
  let live: boolean | null = null; // null until the first connect, or the grace period, decides
  const setLive = (next: boolean) => {
    if (stopped || next === live) return;
    live = next;
    onLiveChange(next);
  };

  function apply(data: HydrateData) {
    if (stopped) return;
    applying = true;
    try {
      store.hydrate(data);
    } finally {
      applying = false;
    }
    last = store.getState();
  }

  // Loads, pushes and incoming changes run through one queue, in order, so a reload never lands
  // between a local change and its write, and a change is never applied under an older snapshot.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = (job: () => Promise<void> | void) => {
    queue = queue
      .then(() => (stopped ? undefined : job()))
      .catch((e: unknown) => {
        if (!stopped) onProblem(errorText(e));
      });
  };

  async function load() {
    try {
      apply(await fetchAll(db));
    } catch (e) {
      throw new Error(`Can't reach the database (${errorText(e)}). The screen will catch up once it's back.`);
    }
  }

  const reload = () => {
    loadRequested = true;
    enqueue(async () => {
      await load();
      onProblem(null);
      onLoaded();
    });
  };

  async function push(prev: SparcState, next: SparcState) {
    const d = diffState(prev, next);
    if (d.newScans.length) {
      // A gate tap: saved all at once by the database, which also refuses the slot if another
      // gate took it first.
      const { error } = await db.rpc("record_tap", tapArgs(d));
      if (error) throw error;
      return;
    }
    const ops = [];
    if (d.upsertUsers.length) ops.push(db.from("users").upsert(d.upsertUsers.map(userToRow)));
    if (d.deleteUserIds.length) ops.push(db.from("users").delete().in("id", d.deleteUserIds));
    if (d.slotChanges.length) ops.push(db.from("slots").upsert(d.slotChanges.map((c) => slotToRow(c.slot))));
    if (d.newLogs.length) ops.push(db.from("logs").insert(d.newLogs.map(logToRow)));
    for (const res of await Promise.all(ops)) if (res.error) throw res.error;
  }

  const unsubscribeStore = store.subscribe(() => {
    if (applying) return;
    const prev = last;
    const next = store.getState();
    last = next;
    enqueue(async () => {
      try {
        await push(prev, next);
      } catch (e) {
        // The write was rejected (or never arrived): show what the database actually holds.
        await load();
        const text = errorText(e);
        if (text.includes("SPARC_SLOT_CHANGED")) {
          const code = (e as { hint?: string }).hint;
          throw new Error(`Another gate just used slot ${code ?? "that slot"}. The screen has been refreshed; please tap the card again.`);
        }
        throw new Error(`Couldn't save the last change (${text}). The screen shows what the database holds.`);
      }
      onProblem(null);
    });
  });

  // A unique topic per start, so React's dev-mode double mount never reuses a channel mid-teardown.
  const channel = db
    .channel(`sparc-console-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
      const change = payload as unknown as Change;
      enqueue(() => apply(applyChange(pick(store.getState()), change)));
    })
    .subscribe((status) => {
      // On the first join and every rejoin (phone woke up, network came back), load a fresh
      // snapshot: anything that happened while disconnected was never delivered as a change.
      if (status === "SUBSCRIBED") {
        setLive(true);
        reload();
      } else {
        setLive(false); // CHANNEL_ERROR, TIMED_OUT or CLOSED; the client keeps retrying on its own
      }
    });

  const fallback = window.setTimeout(() => {
    if (!loadRequested) reload();
  }, FALLBACK_LOAD_MS);
  const watchdog = window.setTimeout(() => {
    if (live !== true) setLive(false);
  }, LIVE_GRACE_MS);

  return () => {
    stopped = true;
    window.clearTimeout(fallback);
    window.clearTimeout(watchdog);
    unsubscribeStore();
    void db.removeChannel(channel);
  };
}
