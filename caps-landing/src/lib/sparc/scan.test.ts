import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSparcStore } from "./store";
import type { UserInput } from "./types";

const T0 = new Date("2026-11-10T08:00:00").getTime();
const DAY = 24 * 60 * 60 * 1000;
/** The end of a semester, as the admin's semester dates would give it. */
const SEMESTER_END = T0 + 60 * DAY;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

function user(n: number, extra: Partial<UserInput> = {}): UserInput {
  const hex = n.toString(16).toUpperCase().padStart(2, "0");
  return {
    name: `Driver ${n}`,
    studentId: "",
    nfcId: `04:A1:B2:${hex}`,
    role: "student",
    active: true,
    ...extra,
  };
}
const nfc = (n: number) => user(n).nfcId;

type Store = ReturnType<typeof createSparcStore>;

function freeCount(store: Store) {
  return store.getState().slots.filter((s) => s.status === "free").length;
}

/** The two steps of an entry: the card check, then the facilitator's floor. */
function enter(store: Store, card: string, floor = 3) {
  const first = store.scan(card, "entry");
  if (first.status !== "needs-floor") return first;
  return store.scan(card, "entry", { floor });
}

describe("store.scan entry", () => {
  it("first asks for a floor, and books nothing until one is chosen", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    const out = store.scan(nfc(1), "entry");
    expect(out.status).toBe("needs-floor");
    expect(store.getState().logs).toHaveLength(0);
    expect(store.getState().scans).toHaveLength(0);
    expect(freeCount(store)).toBe(store.getState().slots.length);
  });

  it("books the first free bay on the floor the facilitator chose", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    store.addUser(user(2));
    const a = enter(store, nfc(1), 4);
    const b = enter(store, nfc(2), 4);
    expect(a).toMatchObject({ status: "entered", floor: 4, slot: "D1" });
    expect(b).toMatchObject({ status: "entered", floor: 4, slot: "D2" });
    const { slots, logs } = store.getState();
    expect(slots.find((s) => s.code === "D1")).toMatchObject({ status: "occupied" });
    expect(slots.find((s) => s.code === "D1")?.occupant?.nfcId).toBe(nfc(1));
    expect(logs.filter((l) => l.event === "entry").map((l) => l.floor)).toEqual([4, 4]);
  });

  it("reports full for a floor with no free slot, while other floors still take cars", () => {
    const store = createSparcStore(T0);
    const perFloor = store.getState().slots.filter((s) => s.floor === 1).length;
    for (let i = 1; i <= perFloor; i++) {
      store.addUser(user(i));
      expect(enter(store, nfc(i), 1).status).toBe("entered");
    }
    store.addUser(user(200));
    const logsBefore = store.getState().logs.length;
    expect(enter(store, nfc(200), 1).status).toBe("full");
    expect(store.getState().logs).toHaveLength(logsBefore);
    expect(enter(store, nfc(200), 2).status).toBe("entered");
  });

  it("refuses a floor that doesn't exist", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    expect(store.scan(nfc(1), "entry", { floor: 9 }).status).toBe("full");
    expect(store.getState().logs).toHaveLength(0);
  });

  it("entry mode: a driver already inside is told so, with no second entry", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    enter(store, nfc(1));
    const free = freeCount(store);
    const out = store.scan(nfc(1), "entry");
    expect(out.status).toBe("already-inside");
    expect(freeCount(store)).toBe(free);
    expect(store.getState().logs).toHaveLength(1);
  });
});

describe("store.scan passes", () => {
  it("rejects an expired pass without touching slots or logs, before asking for a floor", () => {
    const store = createSparcStore(T0);
    const out = store.scan("1234-5678-9012", "entry"); // seeded demo user, lapsed 3 days ago
    expect(out.status).toBe("expired");
    expect(store.getState().logs).toHaveLength(0);
    expect(store.getState().scans).toHaveLength(1);
  });

  it("rejects a suspended account as no-pass", () => {
    const store = createSparcStore(T0);
    store.addUser(user(2, { active: false }));
    expect(store.scan(nfc(2), "entry").status).toBe("no-pass");
  });

  it("rejects unknown cards and matches hex case-insensitively", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    expect(store.scan("04:FF:FF:FF", "entry").status).toBe("unregistered");
    expect(store.scan(nfc(1).toLowerCase(), "entry").status).toBe("needs-floor");
  });

  it("lets a renewed driver in", () => {
    const store = createSparcStore(T0);
    expect(store.scan("1234-5678-9012", "entry").status).toBe("expired");
    store.renewUser("U-DEMO-001", SEMESTER_END);
    expect(store.scan("1234-5678-9012", "entry").status).toBe("needs-floor");
  });
});

describe("pending members", () => {
  it("a member without a card is Pending: no pass, and no card to scan", () => {
    const store = createSparcStore(T0);
    store.addUser(user(7, { nfcId: "", email: "Seven@usa.edu.ph" }));
    const pending = store.getState().users.find((u) => u.name === "Driver 7")!;
    expect(pending).toMatchObject({ nfcId: "", expiresAt: 0, email: "seven@usa.edu.ph" });
    // a blank or unknown scan must never land on the pending member
    expect(store.scan("", "entry").status).toBe("unregistered");
    expect(store.scan("04:FF:FF:FF", "entry").status).toBe("unregistered");
  });

  it("a member who gave their card at sign-up is known at the gate but denied until the pass is activated", () => {
    const store = createSparcStore(T0);
    const base = store.getState();
    const member = { id: "M1", nfcId: "04:AB:CD:EF", name: "Signed Up", role: "student" as const, active: true, createdAt: T0, expiresAt: 0, email: "s@usa.edu.ph" };
    store.hydrate({ slots: base.slots, users: [...base.users, member], logs: [], scans: [] });
    // known card, so not "unregistered", and not a walk-in either
    expect(store.scan("04:AB:CD:EF", "entry").status).toBe("no-pass");
    expect(store.scan("04:AB:CD:EF", "entry", { walkIn: true, floor: 3 }).status).toBe("no-pass");
    expect(store.getState().logs).toHaveLength(0);
    // the office activates it with the card already on file
    expect(store.activateUser("M1", "04:AB:CD:EF", SEMESTER_END).ok).toBe(true);
    expect(store.getState().users.find((u) => u.id === "M1")).toMatchObject({ expiresAt: SEMESTER_END, active: true });
    expect(enter(store, "04:AB:CD:EF", 2).status).toBe("entered");
  });

  it("activating gives the card, runs the pass to the semester end, and lets them in", () => {
    const store = createSparcStore(T0);
    store.addUser(user(7, { nfcId: "" }));
    const id = store.getState().users.find((u) => u.name === "Driver 7")!.id;
    expect(store.activateUser(id, "04:aa:bb:cc", SEMESTER_END).ok).toBe(true);
    const u = store.getState().users.find((x) => x.id === id)!;
    expect(u).toMatchObject({ nfcId: "04:AA:BB:CC", active: true, expiresAt: SEMESTER_END });
    expect(enter(store, "04:AA:BB:CC", 2).status).toBe("entered");
  });

  it("refuses a card that already belongs to someone else, and an unknown member", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    store.addUser(user(7, { nfcId: "" }));
    const id = store.getState().users.find((u) => u.name === "Driver 7")!.id;
    const taken = store.activateUser(id, nfc(1), SEMESTER_END);
    expect(taken.ok).toBe(false);
    expect(store.getState().users.find((u) => u.id === id)!.expiresAt).toBe(0);
    expect(store.activateUser("nope", "04:AA:BB:CC", SEMESTER_END).ok).toBe(false);
    expect(store.activateUser(id, "xyz", SEMESTER_END).ok).toBe(false);
  });
});

describe("walk-ins (an unregistered card the facilitator lets in after seeing a receipt)", () => {
  const CARD = "04:77:88:99";

  it("an unregistered card is still rejected unless the facilitator confirms a walk-in", () => {
    const store = createSparcStore(T0);
    expect(store.scan(CARD, "entry").status).toBe("unregistered");
    expect(store.scan(CARD, "entry", { floor: 3 }).status).toBe("unregistered");
    expect(store.getState().logs).toHaveLength(0);
  });

  it("a confirmed walk-in asks for a floor, books nothing yet, then takes a bay there", () => {
    const store = createSparcStore(T0);
    const first = store.scan(CARD, "entry", { walkIn: true });
    expect(first).toMatchObject({ status: "needs-floor", walkIn: true });
    expect(store.getState().logs).toHaveLength(0);

    const before = freeCount(store);
    const out = store.scan(CARD, "entry", { walkIn: true, floor: 2 });
    expect(out).toMatchObject({ status: "entered", walkIn: true, floor: 2, slot: "B1" });
    expect(freeCount(store)).toBe(before - 1);
    const { logs, slots } = store.getState();
    expect(logs[0]).toMatchObject({ event: "entry", userId: null, userName: "Walk-in", nfcId: CARD, floor: 2, slot: "B1" });
    expect(slots.find((x) => x.code === "B1")?.occupant).toMatchObject({ name: "Walk-in", nfcId: CARD });
  });

  it("tapping the same card again at entry says already inside, and nothing is double booked", () => {
    const store = createSparcStore(T0);
    store.scan(CARD, "entry", { walkIn: true, floor: 4 });
    const free = freeCount(store);
    expect(store.scan(CARD, "entry", { walkIn: true, floor: 4 })).toMatchObject({ status: "already-inside", walkIn: true });
    expect(freeCount(store)).toBe(free);
    expect(store.getState().logs).toHaveLength(1);
  });

  it("the same card at exit frees the bay and pairs the visit, with no confirmation needed", () => {
    const store = createSparcStore(T0);
    store.scan(CARD, "entry", { walkIn: true, floor: 5 });
    vi.setSystemTime(T0 + 90 * 60_000);
    const out = store.scan(CARD, "exit");
    expect(out).toMatchObject({ status: "exited", walkIn: true, floor: 5 });
    const { logs, slots } = store.getState();
    const entry = logs.find((l) => l.event === "entry")!;
    const exit = logs.find((l) => l.event === "exit")!;
    expect(exit).toMatchObject({ userId: null, userName: "Walk-in", visitId: entry.visitId });
    expect(slots.every((x) => x.status === "free")).toBe(true);
  });

  it("an unregistered card at exit that isn't parked is still unregistered", () => {
    const store = createSparcStore(T0);
    expect(store.scan(CARD, "exit").status).toBe("unregistered");
  });

  it("a full floor refuses the walk-in", () => {
    const store = createSparcStore(T0);
    const perFloor = store.getState().slots.filter((x) => x.floor === 1).length;
    for (let i = 0; i < perFloor; i++) expect(store.scan(`04:77:00:${i.toString(16).padStart(2, "0")}`, "entry", { walkIn: true, floor: 1 }).status).toBe("entered");
    const logs = store.getState().logs.length;
    expect(store.scan(CARD, "entry", { walkIn: true, floor: 1 }).status).toBe("full");
    expect(store.getState().logs).toHaveLength(logs);
  });

  it("can never be used to get past a member's pass: a registered card is always checked as a member", () => {
    const store = createSparcStore(T0);
    expect(store.scan("1234-5678-9012", "entry", { walkIn: true, floor: 3 }).status).toBe("expired"); // lapsed demo member
    store.addUser(user(2, { active: false }));
    expect(store.scan(nfc(2), "entry", { walkIn: true, floor: 3 }).status).toBe("no-pass");
    expect(store.getState().logs).toHaveLength(0);
  });
});

describe("pass end dates", () => {
  it("refuses an end date that isn't in the future, for activation and renewal", () => {
    const store = createSparcStore(T0);
    store.addUser(user(7, { nfcId: "" }));
    const id = store.getState().users.find((u) => u.name === "Driver 7")!.id;
    expect(store.activateUser(id, "04:AA:BB:CC", T0 - DAY).ok).toBe(false);
    expect(store.activateUser(id, "04:AA:BB:CC", 0).ok).toBe(false);
    expect(store.getState().users.find((u) => u.id === id)!.expiresAt).toBe(0);
    expect(store.renewUser("U-DEMO-001", T0 - DAY).ok).toBe(false);
  });

  it("renewing sets the pass to the given semester end and turns a suspended card back on", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1, { active: false }));
    const id = store.getState().users.find((u) => u.name === "Driver 1")!.id;
    expect(store.renewUser(id, SEMESTER_END).ok).toBe(true);
    expect(store.getState().users.find((u) => u.id === id)).toMatchObject({ expiresAt: SEMESTER_END, active: true });
  });
});

describe("store.scan exit", () => {
  it("exits on the second scan and pairs the visit", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    enter(store, nfc(1));
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
    enter(store, nfc(1));
    vi.setSystemTime(T0 + 60_000);
    store.scan(nfc(1), "exit");
    expect(store.getState().logs.map((l) => l.event)).toEqual(["exit", "entry"]);
  });

  it("lets a parked driver exit after their pass expires", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    expect(enter(store, nfc(1)).status).toBe("entered");
    vi.setSystemTime(T0 + 40 * DAY);
    expect(store.scan(nfc(1), "exit").status).toBe("exited");
  });

  it("a driver who is not inside gets not-inside and nothing is logged", () => {
    const store = createSparcStore(T0);
    store.addUser(user(1));
    expect(store.scan(nfc(1), "exit").status).toBe("not-inside");
    expect(store.getState().logs).toHaveLength(0);
    expect(freeCount(store)).toBe(store.getState().slots.length);
  });

  it("an expired driver who is not inside is not-inside, not expired", () => {
    const store = createSparcStore(T0);
    expect(store.scan("1234-5678-9012", "exit").status).toBe("not-inside");
  });

  it("unknown cards are still unregistered", () => {
    const store = createSparcStore(T0);
    expect(store.scan("04:FF:FF:FF", "exit").status).toBe("unregistered");
  });
});

describe("recent scans", () => {
  it("keeps only the 50 most recent scans, newest first", () => {
    const store = createSparcStore(T0);
    for (let i = 0; i < 60; i++) store.scan(`04:00:00:${(i % 200).toString(16).padStart(2, "0")}`, "entry");
    const { scans } = store.getState();
    expect(scans).toHaveLength(50);
    expect(scans[0].at).toBeGreaterThanOrEqual(scans[49].at);
  });
});
