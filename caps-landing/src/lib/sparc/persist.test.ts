import { describe, expect, it, vi } from "vitest";
import { createSparcStore, type SparcStorage } from "./store";
import type { UserInput } from "./types";

const T0 = new Date("2026-11-13T08:00:00").getTime();

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const storage: SparcStorage & { data: Record<string, string> } = {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
  return storage;
}

const input = (n: number): UserInput => ({
  name: `Driver ${n}`,
  studentId: "",
  nfcId: `04:A1:B2:0${n}`,
  role: "student",
  vehicle: "light",
  active: true,
});

describe("store persistence", () => {
  it("keeps registered users after a reload", () => {
    const storage = memoryStorage();
    createSparcStore(T0, storage).addUser(input(1));
    const reloaded = createSparcStore(T0 + 60_000, storage);
    expect(reloaded.getState().users.map((u) => u.name)).toContain("Driver 1");
  });

  it("keeps parked vehicles, logs and recent scans after a reload", () => {
    const storage = memoryStorage();
    const a = createSparcStore(T0, storage);
    a.addUser(input(1));
    const out = a.scan("04:A1:B2:01", "entry");
    expect(out.status).toBe("entered");

    const b = createSparcStore(T0 + 60_000, storage).getState();
    expect(b.slots.filter((s) => s.status === "occupied")).toHaveLength(1);
    expect(b.logs).toHaveLength(1);
    expect(b.scans).toHaveLength(1);
  });

  it("keeps the next ids going so new records never collide", () => {
    const storage = memoryStorage();
    const a = createSparcStore(T0, storage);
    a.addUser(input(1));
    const b = createSparcStore(T0, storage);
    b.addUser(input(2));
    const ids = b.getState().users.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("seeds the demo user once, and a removed user stays removed", () => {
    const storage = memoryStorage();
    const a = createSparcStore(T0, storage);
    expect(a.getState().users.filter((u) => u.id === "U-DEMO-001")).toHaveLength(1);
    expect(a.removeUser("U-DEMO-001").ok).toBe(true);
    const b = createSparcStore(T0, storage);
    expect(b.getState().users.find((u) => u.id === "U-DEMO-001")).toBeUndefined();
  });

  it("ignores corrupt or wrong-shaped saved data instead of crashing", () => {
    for (const bad of ["{not json", "null", '{"users": 5}', "[]"]) {
      const store = createSparcStore(T0, memoryStorage({ "sparc:data:v1": bad }));
      expect(store.getState().users.length).toBeGreaterThan(0);
    }
  });

  it("still works when storage refuses writes (private mode, quota)", () => {
    const storage: SparcStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const store = createSparcStore(T0, storage);
    expect(store.addUser(input(1)).ok).toBe(true);
    expect(store.getState().users.some((u) => u.name === "Driver 1")).toBe(true);
  });

  it("refresh() picks up changes saved by another tab, without writing back", () => {
    const storage = memoryStorage();
    const tabA = createSparcStore(T0, storage);
    const tabB = createSparcStore(T0, storage);
    tabA.addUser(input(1));
    const spy = vi.spyOn(storage, "setItem");
    const listener = vi.fn();
    tabB.subscribe(listener);
    tabB.refresh();
    expect(tabB.getState().users.some((u) => u.name === "Driver 1")).toBe(true);
    expect(listener).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("works without any storage (tests, server)", () => {
    const store = createSparcStore(T0);
    expect(store.addUser(input(1)).ok).toBe(true);
    expect(() => store.refresh()).not.toThrow();
  });
});
