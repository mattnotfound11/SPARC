import { describe, expect, it } from "vitest";
import { createSparcStore, uniqueId } from "@/lib/sparc/store";
import { startOfDay } from "@/lib/sparc/seed";
import type { UserInput } from "@/lib/sparc/types";
import {
  LOG_DAYS,
  SCAN_LIMIT,
  applyChange,
  diffState,
  errorText,
  historyStart,
  logFromRow,
  logToRow,
  scanToRow,
  slotFromRow,
  slotToRow,
  tapArgs,
  userFromRow,
  userToRow,
  type Change,
} from "./sync";

const ANA: UserInput = { name: "Ana Reyes", studentId: "2022-00456", nfcId: "04:A1:B2:C3", role: "student", vehicle: "light", active: true };

/** A store the way the console creates it with a database: collision-free ids, no browser storage. */
function seeded() {
  const store = createSparcStore(undefined, undefined, { newId: uniqueId });
  store.addUser(ANA);
  return store;
}

describe("row mapping", () => {
  it("round-trips users, slots and logs", () => {
    const store = seeded();
    store.scan("04:A1:B2:C3", "entry");
    const s = store.getState();
    expect(userFromRow(userToRow(s.users[0]))).toEqual(s.users[0]);
    const taken = s.slots.find((x) => x.status === "occupied")!;
    expect(slotFromRow(slotToRow(taken))).toEqual(taken);
    expect(slotFromRow(slotToRow(s.slots[0]))).toEqual(s.slots[0]);
    expect(logFromRow(logToRow(s.logs[0]))).toEqual(s.logs[0]);
  });

  it("stores a blank student ID as null and reads it back as absent", () => {
    const store = createSparcStore(undefined, undefined, { newId: uniqueId });
    store.addUser({ ...ANA, studentId: "" });
    const u = store.getState().users[0];
    expect(userToRow(u).student_id).toBeNull();
    expect(userFromRow(userToRow(u))).not.toHaveProperty("studentId");
  });
});

describe("diffState and tapArgs", () => {
  it("an entry tap becomes one record_tap call with the slot as it was before", () => {
    const store = seeded();
    const before = store.getState();
    store.scan("04:A1:B2:C3", "entry");
    const d = diffState(before, store.getState());
    expect(d.slotChanges).toHaveLength(1);
    expect(d.newLogs).toHaveLength(1);
    expect(d.newScans).toHaveLength(1);
    expect(d.upsertUsers).toHaveLength(0);
    const args = tapArgs(d);
    expect(args.p_slot?.status).toBe("occupied");
    expect(args.p_slot_before).toEqual({ status: "free", occupant_user_id: null });
    expect(args.p_log?.event).toBe("entry");
  });

  it("an exit tap tells the database who it expects in the slot", () => {
    const store = seeded();
    store.scan("04:A1:B2:C3", "entry");
    const before = store.getState();
    const userId = before.users[0].id;
    store.scan("04:A1:B2:C3", "exit");
    const args = tapArgs(diffState(before, store.getState()));
    expect(args.p_slot?.status).toBe("free");
    expect(args.p_slot_before).toEqual({ status: "occupied", occupant_user_id: userId });
  });

  it("a refused tap is a scan row only", () => {
    const store = seeded();
    const before = store.getState();
    store.scan("99:88:77:66", "entry");
    const args = tapArgs(diffState(before, store.getState()));
    expect(args.p_scan.nfc_id).toBe("99:88:77:66");
    expect(args.p_log).toBeNull();
    expect(args.p_slot).toBeNull();
  });

  it("reports deleted users", () => {
    const store = seeded();
    const before = store.getState();
    store.removeUser(before.users[0].id);
    expect(diffState(before, store.getState()).deleteUserIds).toEqual([before.users[0].id]);
  });
});

describe("hydrate", () => {
  it("replaces the synced tables, and the next tap builds on them", () => {
    const a = seeded();
    a.scan("04:A1:B2:C3", "entry");
    const b = createSparcStore(undefined, undefined, { newId: uniqueId });
    b.hydrate(a.getState());
    expect(b.getState().users).toEqual(a.getState().users);
    expect(b.getState().slots).toEqual(a.getState().slots);
    b.scan("04:A1:B2:C3", "exit");
    const [exit, entry] = b.getState().logs;
    expect(exit.event).toBe("exit");
    expect(exit.visitId).toBe(entry.visitId);
    expect(b.getState().slots.every((s) => s.status === "free")).toBe(true);
  });
});

describe("applyChange", () => {
  it("matches what the other device did after a tap there", () => {
    const a = seeded();
    const before = a.getState();
    let data = { users: before.users, slots: before.slots, logs: before.logs, scans: before.scans };
    a.scan("04:A1:B2:C3", "entry");
    const s = a.getState();
    const taken = s.slots.find((x) => x.status === "occupied")!;
    const changes: Change[] = [
      { table: "slots", eventType: "UPDATE", new: slotToRow(taken), old: { code: taken.code } },
      { table: "logs", eventType: "INSERT", new: logToRow(s.logs[0]), old: {} },
      { table: "scans", eventType: "INSERT", new: scanToRow(s.scans[0]), old: {} },
    ];
    for (const c of changes) data = applyChange(data, c);
    expect(data.slots).toEqual(s.slots);
    expect(data.logs).toEqual(s.logs);
    expect(data.scans[0].id).toBe(s.scans[0].id);
  });

  it("is idempotent and keeps untouched items by reference", () => {
    const s = seeded().getState();
    const data = { users: s.users, slots: s.slots, logs: s.logs, scans: s.scans };
    const change: Change = { table: "users", eventType: "UPDATE", new: { ...userToRow(s.users[0]), name: "Ana R." }, old: {} };
    const once = applyChange(data, change);
    expect(applyChange(once, change)).toEqual(once);
    expect(once.users[0].name).toBe("Ana R.");
    expect(once.slots).toBe(s.slots);
  });

  it("removes deleted users and ignores other tables", () => {
    const s = seeded().getState();
    const data = { users: s.users, slots: s.slots, logs: s.logs, scans: s.scans };
    const del = applyChange(data, { table: "users", eventType: "DELETE", new: {}, old: { id: s.users[0].id } });
    expect(del.users.map((u) => u.id)).not.toContain(s.users[0].id);
    expect(del.users).toHaveLength(s.users.length - 1);
    expect(applyChange(data, { table: "sparc_availability", eventType: "UPDATE", new: { free: 1 }, old: {} })).toBe(data);
  });

  it("keeps scans newest first and capped", () => {
    let data = { users: [], slots: [], logs: [], scans: [] } as Parameters<typeof applyChange>[0];
    for (let i = 1; i <= SCAN_LIMIT + 5; i++)
      data = applyChange(data, {
        table: "scans",
        eventType: "INSERT",
        new: { id: `S-${i}`, at: i, nfc_id: "x", outcome: { status: "unregistered", nfcId: "x" } },
        old: {},
      });
    expect(data.scans).toHaveLength(SCAN_LIMIT);
    expect(data.scans[0].id).toBe(`S-${SCAN_LIMIT + 5}`);
  });
});

describe("ids with a shared database", () => {
  it("uniqueId never repeats and keeps its prefix", () => {
    const ids = new Set(Array.from({ length: 5000 }, () => uniqueId("L")));
    expect(ids.size).toBe(5000);
    for (const id of [...ids].slice(0, 20)) expect(id).toMatch(/^L-[0-9A-Z]{16,}$/);
  });

  it("two devices never produce the same ids", () => {
    const a = seeded();
    const b = seeded();
    a.scan("04:A1:B2:C3", "entry");
    b.scan("04:A1:B2:C3", "entry");
    expect(a.getState().logs[0].id).not.toBe(b.getState().logs[0].id);
    expect(a.getState().scans[0].id).not.toBe(b.getState().scans[0].id);
    expect(a.getState().users[0].id).not.toBe(b.getState().users[0].id);
  });

  it("the local counters still work without a database", () => {
    const local = createSparcStore();
    local.addUser(ANA);
    expect(local.getState().users[0].id).toBe("U-001");
  });
});

describe("helpers", () => {
  it("historyStart covers today and the days before it", () => {
    const now = new Date(2026, 10, 13, 15, 30).getTime();
    const expected = new Date(2026, 10, 13);
    expected.setDate(expected.getDate() - (LOG_DAYS - 1));
    expect(historyStart(now)).toBe(startOfDay(expected.getTime()));
  });

  it("errorText reads Supabase's plain-object errors", () => {
    expect(errorText({ message: "new row violates row-level security policy", code: "42501" })).toBe("new row violates row-level security policy");
    expect(errorText(new Error("Failed to fetch"))).toBe("Failed to fetch");
    expect(errorText("plain")).toBe("plain");
  });
});
