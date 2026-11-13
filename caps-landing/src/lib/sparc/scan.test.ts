import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSparcStore } from "./store";
import type { UserInput, VehicleClass } from "./types";

const T0 = new Date("2026-11-10T08:00:00").getTime();
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

function user(n: number, vehicle: VehicleClass = "light", extra: Partial<UserInput> = {}): UserInput {
  const hex = n.toString(16).toUpperCase().padStart(2, "0");
  return {
    name: `Driver ${n}`,
    studentId: "",
    nfcId: `04:A1:B2:${hex}`,
    role: "student",
    vehicle,
    active: true,
    ...extra,
  };
}
const nfc = (n: number) => user(n).nfcId;

function freeCount(store: ReturnType<typeof createSparcStore>) {
  return store.getState().slots.filter((s) => s.status === "free").length;
}

describe("store.scan", () => {
  it("enters a valid pass into a free slot of the right class", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    const before = freeCount(store);
    const out = store.scan(nfc(1), "entry");
    expect(out.status).toBe("entered");
    const s = store.getState();
    expect(freeCount(store)).toBe(before - 1);
    expect(s.logs.filter((l) => l.event === "entry")).toHaveLength(1);
    if (out.status === "entered") {
      const slot = s.slots.find((x) => x.code === out.slot)!;
      expect(slot.vehicle).toBe("light");
      expect(slot.status).toBe("occupied");
      expect(slot.occupant?.nfcId).toBe(nfc(1));
    }
  });

  it("exits on the second scan and pairs the visit", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    store.scan(nfc(1), "entry");
    const out = store.scan(nfc(1), "exit");
    expect(out.status).toBe("exited");
    const { logs } = store.getState();
    const entry = logs.find((l) => l.event === "entry")!;
    const exit = logs.find((l) => l.event === "exit")!;
    expect(exit.visitId).toBe(entry.visitId);
    expect(store.getState().slots.every((s) => s.status === "free")).toBe(true);
  });

  it("keeps logs newest first, like the rest of the console", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    store.scan(nfc(1), "entry");
    vi.setSystemTime(T0 + 60_000);
    store.scan(nfc(1), "exit");
    expect(store.getState().logs.map((l) => l.event)).toEqual(["exit", "entry"]);
  });

  it("rejects an expired pass without touching slots or logs", () => {
    const store = createSparcStore(T0);
    const out = store.scan("1234-5678-9012", "entry"); // seeded demo user, lapsed 3 days ago
    expect(out.status).toBe("expired");
    expect(store.getState().logs).toHaveLength(0);
    expect(store.getState().scans).toHaveLength(1);
  });

  it("rejects a suspended account as no-pass", () => {
    const store = createSparcStore(T0);
    store.addUser(user(2, "light", { active: false }));
    expect(store.scan(nfc(2), "entry").status).toBe("no-pass");
  });

  it("rejects unknown cards and matches hex case-insensitively", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    expect(store.scan("04:FF:FF:FF", "entry").status).toBe("unregistered");
    expect(store.scan(nfc(1).toLowerCase(), "entry").status).toBe("entered");
  });

  it("reports full for a class with no free slot, while other classes still enter", () => {
    const store = createSparcStore(T0);
    const heavy = store.getState().slots.filter((s) => s.vehicle === "heavy").length;
    for (let i = 1; i <= heavy; i++) {
      store.addUser(user(i, "heavy"));
      expect(store.scan(nfc(i), "entry").status).toBe("entered");
    }
    store.addUser(user(200, "heavy"));
    const logsBefore = store.getState().logs.length;
    expect(store.scan(nfc(200), "entry").status).toBe("full");
    expect(store.getState().logs).toHaveLength(logsBefore);
    store.addUser(user(201, "light"));
    expect(store.scan(nfc(201), "entry").status).toBe("entered");
  });

  it("lets a parked driver exit after their pass expires", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    expect(store.scan(nfc(1), "entry").status).toBe("entered");
    vi.setSystemTime(T0 + 40 * DAY);
    expect(store.scan(nfc(1), "exit").status).toBe("exited");
  });

  it("lets a renewed driver in", () => {
    const store = createSparcStore(T0);
    expect(store.scan("1234-5678-9012", "entry").status).toBe("expired");
    store.renewUser("U-DEMO-001");
    expect(store.scan("1234-5678-9012", "entry").status).toBe("entered");
  });

  it("keeps only the 50 most recent scans, newest first", () => {
    const store = createSparcStore(T0);
    for (let i = 0; i < 60; i++) store.scan(`04:00:00:${(i % 200).toString(16).padStart(2, "0")}`, "entry");
    const { scans } = store.getState();
    expect(scans).toHaveLength(50);
    expect(scans[0].at).toBeGreaterThanOrEqual(scans[49].at);
  });

  it("entry mode: a driver already inside is told so, with no second entry", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    store.scan(nfc(1), "entry");
    const free = freeCount(store);
    const out = store.scan(nfc(1), "entry");
    expect(out.status).toBe("already-inside");
    expect(freeCount(store)).toBe(free);
    expect(store.getState().logs).toHaveLength(1);
  });

  it("exit mode: a driver who is not inside gets not-inside and nothing is logged", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    expect(store.scan(nfc(1), "exit").status).toBe("not-inside");
    expect(store.getState().logs).toHaveLength(0);
    expect(freeCount(store)).toBe(store.getState().slots.length);
  });

  it("exit mode: an expired driver who is not inside is not-inside, not expired", () => {
    const store = createSparcStore(T0);
    expect(store.scan("1234-5678-9012", "exit").status).toBe("not-inside");
  });

  it("exit mode: unknown cards are still unregistered", () => {
    const store = createSparcStore(T0);
    expect(store.scan("04:FF:FF:FF", "exit").status).toBe("unregistered");
  });
});
