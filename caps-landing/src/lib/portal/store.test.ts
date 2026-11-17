import { describe, expect, it } from "vitest";
import { DEMO_PASS_CODE, createPortalStore, normalizePlate } from "./store";
import type { PortalState } from "./types";

const empty = (): PortalState => ({ vehicles: [], activeVehicle: {}, violations: [], appeals: [], passes: [] });
const make = (initial: PortalState = empty()) => createPortalStore(() => initial, () => {});
const CARD = "123456789012";

describe("vehicles", () => {
  it("normalizes plates", () => {
    expect(normalizePlate("  abc   1234 ")).toBe("ABC 1234");
  });

  it("makes the first vehicle active", () => {
    const s = make();
    expect(s.addVehicle(CARD, { plate: "abc 1234", type: "light" })).toEqual({ ok: true });
    const v = s.get().vehicles[0];
    expect(v.plate).toBe("ABC 1234");
    expect(s.get().activeVehicle[CARD]).toBe(v.id);
  });

  it("rejects a bad plate", () => {
    const r = make().addVehicle(CARD, { plate: "!", type: "light" });
    expect(r.ok).toBe(false);
  });

  it("allows up to 3 vehicles, then refuses", () => {
    const s = make();
    for (const p of ["ABC 1111", "ABC 2222", "ABC 3333"]) expect(s.addVehicle(CARD, { plate: p, type: "light" }).ok).toBe(true);
    const r = s.addVehicle(CARD, { plate: "ABC 4444", type: "light" });
    expect(r).toEqual({ ok: false, error: "You can register up to 3 vehicles." });
  });

  it("refuses a duplicate plate", () => {
    const s = make();
    s.addVehicle(CARD, { plate: "ABC 1234", type: "light" });
    expect(s.addVehicle("999999999999", { plate: "abc 1234", type: "light" }).ok).toBe(false);
  });

  it("switches the active vehicle", () => {
    const s = make();
    s.addVehicle(CARD, { plate: "ABC 1111", type: "light" });
    s.addVehicle(CARD, { plate: "ABC 2222", type: "heavy" });
    const second = s.get().vehicles[1];
    expect(s.setActive(CARD, second.id).ok).toBe(true);
    expect(s.get().activeVehicle[CARD]).toBe(second.id);
  });

  it("falls back to another owned vehicle when the active one is removed", () => {
    const s = make();
    s.addVehicle(CARD, { plate: "ABC 1111", type: "light" });
    s.addVehicle(CARD, { plate: "ABC 2222", type: "light" });
    const [first, second] = s.get().vehicles;
    s.removeVehicle(CARD, first.id);
    expect(s.get().activeVehicle[CARD]).toBe(second.id);
    s.removeVehicle(CARD, second.id);
    expect(s.get().activeVehicle[CARD]).toBeUndefined();
  });

  it("cannot touch another owner's vehicle", () => {
    const s = make();
    s.addVehicle(CARD, { plate: "ABC 1111", type: "light" });
    const id = s.get().vehicles[0].id;
    expect(s.removeVehicle("999999999999", id).ok).toBe(false);
    expect(s.setActive("999999999999", id).ok).toBe(false);
  });
});

describe("temporary vehicles", () => {
  const noon = new Date(2026, 10, 17, 12, 0).getTime();

  it("is valid until the end of the day and becomes active", () => {
    const s = make();
    s.addTemporary(CARD, { plate: "RNT 5555", type: "light" }, noon);
    const v = s.get().vehicles[0];
    expect(v.kind).toBe("temporary");
    expect(new Date(v.validUntil!).getHours()).toBe(23);
    expect(new Date(v.validUntil!).getDate()).toBe(17);
    expect(s.get().activeVehicle[CARD]).toBe(v.id);
  });

  it("does not count toward the 3-vehicle limit", () => {
    const s = make();
    for (const p of ["ABC 1111", "ABC 2222", "ABC 3333"]) s.addVehicle(CARD, { plate: p, type: "light" });
    expect(s.addTemporary(CARD, { plate: "RNT 5555", type: "light" }, noon).ok).toBe(true);
  });
});

describe("violations and appeals", () => {
  const withViolation = (status: "open" | "appealed" = "open"): PortalState => ({
    ...empty(),
    violations: [{ id: "vio-1", ownerCard: CARD, type: "overstay", at: 1, status }],
  });

  it("moves an open violation to appealed and stores the note", () => {
    const s = make(withViolation());
    expect(s.appeal("vio-1", "The shuttle broke down, I could not leave.", 5).ok).toBe(true);
    expect(s.get().violations[0].status).toBe("appealed");
    expect(s.get().appeals[0]).toMatchObject({ violationId: "vio-1", note: "The shuttle broke down, I could not leave." });
  });

  it("requires a real note", () => {
    const s = make(withViolation());
    expect(s.appeal("vio-1", "no").ok).toBe(false);
    expect(s.get().violations[0].status).toBe("open");
  });

  it("allows only one appeal per violation", () => {
    const s = make(withViolation());
    s.appeal("vio-1", "A long enough explanation here.");
    expect(s.appeal("vio-1", "Another long explanation here.").ok).toBe(false);
    expect(s.get().appeals).toHaveLength(1);
  });

  it("refuses an unknown violation", () => {
    expect(make().appeal("nope", "A long enough explanation.").ok).toBe(false);
  });

  it("lets an admin confirm a flag, keeping the strike", () => {
    const s = make(withViolation());
    expect(s.reviewViolation("vio-1", "confirm", 9).ok).toBe(true);
    expect(s.get().violations[0]).toMatchObject({ status: "confirmed", reviewedAt: 9 });
  });

  it("lets an admin dismiss an appealed violation", () => {
    const s = make(withViolation());
    s.appeal("vio-1", "The exit gate was stuck for an hour.");
    expect(s.reviewViolation("vio-1", "dismiss", 12).ok).toBe(true);
    expect(s.get().violations[0]).toMatchObject({ status: "dismissed", reviewedAt: 12 });
    expect(s.get().appeals).toHaveLength(1); // the driver's note is kept
  });

  it("decides a violation only once, and a decided one cannot be appealed", () => {
    const s = make(withViolation());
    s.reviewViolation("vio-1", "confirm");
    expect(s.reviewViolation("vio-1", "dismiss").ok).toBe(false);
    expect(s.get().violations[0].status).toBe("confirmed");
    expect(s.appeal("vio-1", "A long enough explanation here.").ok).toBe(false);
  });

  it("refuses an unknown violation", () => {
    expect(make().reviewViolation("nope", "confirm").ok).toBe(false);
  });

  it("seeds sample violations once per card", () => {
    const s = make();
    s.seedSample(CARD);
    s.seedSample(CARD);
    expect(s.get().violations).toHaveLength(4);
  });
});

describe("visitor passes", () => {
  const monday = new Date(2026, 10, 16, 9, 0).getTime();
  const tomorrow = new Date(2026, 10, 17).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const valid = { guestName: "Maria Reyes", plate: "vis 1234", date: monday, purpose: "Thesis defense" };

  it("creates a pass with a readable code and a normalized plate", () => {
    const r = make().createPass(CARD, valid, monday);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pass.code).toMatch(/^SPARC-V-[A-HJ-NP-Z2-9]{8}$/);
    expect(r.pass.plate).toBe("VIS 1234");
    expect(r.pass.hostCard).toBe(CARD);
    expect(new Date(r.pass.date).getHours()).toBe(0);
  });

  it.each([
    [{ ...valid, guestName: "M" }, "full name"],
    [{ ...valid, plate: "!" }, "plate"],
    [{ ...valid, purpose: "" }, "visiting"],
    [{ ...valid, date: monday - 2 * DAY_MS }, "passed"],
    [{ ...valid, date: monday + 45 * DAY_MS }, "ahead"],
  ])("rejects bad input: %#", (input, hint) => {
    const r = make().createPass(CARD, input, monday);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(hint);
  });

  it("lets the gate accept a pass once, on its day", () => {
    const s = make();
    const r = s.createPass(CARD, valid, monday);
    if (!r.ok) throw new Error("setup");
    expect(s.redeemPass(r.pass.code, monday + 3600000).status).toBe("ok");
    expect(s.redeemPass(r.pass.code, monday + 7200000).status).toBe("used");
  });

  it("accepts a typed code in any case and spacing", () => {
    const s = make();
    const r = s.createPass(CARD, valid, monday);
    if (!r.ok) throw new Error("setup");
    expect(s.redeemPass("  " + r.pass.code.toLowerCase().replace("-", " - ") + " ", monday).status).toBe("ok");
  });

  it("refuses unknown and early passes without using them up", () => {
    const s = make();
    expect(s.redeemPass("SPARC-V-NOPE", monday).status).toBe("unknown");
    const r = s.createPass(CARD, { ...valid, date: tomorrow }, monday);
    if (!r.ok) throw new Error("setup");
    expect(s.redeemPass(r.pass.code, monday).status).toBe("early");
    expect(s.get().passes[0].usedAt).toBeUndefined();
    expect(s.redeemPass(r.pass.code, tomorrow + DAY_MS + 3600000).status).toBe("expired");
  });

  it("an unused pass expires at the end of its day", () => {
    const s = make();
    const r = s.createPass(CARD, valid, monday);
    if (!r.ok) throw new Error("setup");
    expect(s.redeemPass(r.pass.code, new Date(2026, 10, 17, 0, 1).getTime()).status).toBe("expired");
    expect(s.redeemPass(r.pass.code, new Date(2026, 10, 16, 23, 59).getTime()).status).toBe("ok");
  });
});

describe("demo account", () => {
  const now = new Date(2026, 10, 16, 10).getTime();

  it("fills the demo card with vehicles, an appeal, strikes and a pass for today", () => {
    const s = make();
    s.seedDemo(now);
    const st = s.get();
    expect(st.demo).toBe(true);
    expect(st.vehicles).toHaveLength(2);
    expect(st.appeals).toHaveLength(1);
    expect(st.violations.filter((v) => v.status === "confirmed")).toHaveLength(2);
    expect(s.redeemPass(DEMO_PASS_CODE, now).status).toBe("ok");
  });

  it("does not duplicate the data when loaded twice", () => {
    const s = make();
    s.seedDemo(now);
    s.seedDemo(now);
    expect(s.get().vehicles).toHaveLength(2);
    expect(s.get().violations).toHaveLength(5);
  });
});

describe("seedDrivers", () => {
  const cards = Array.from({ length: 30 }, (_, i) => `4000000010${String(i).padStart(2, "0")}`);
  const drivers = cards.map((card) => ({ card, type: "light" as const }));

  it("spreads violations, appeals and strikes, and leaves one card suspended", () => {
    const s = make();
    s.seedDrivers(drivers);
    const st = s.get();
    expect(st.violations.filter((v) => v.status === "appealed")).toHaveLength(3);
    expect(st.appeals.length).toBeGreaterThanOrEqual(3);
    expect(st.violations.filter((v) => v.ownerCard === cards[0] && v.status === "confirmed")).toHaveLength(3);
    expect(st.vehicles).toHaveLength(30);
    expect(st.passes.filter((p) => p.sample)).toHaveLength(4);
    for (const a of st.appeals) expect(st.violations.some((v) => v.id === a.violationId)).toBe(true);
  });

  it("does not duplicate when loaded twice", () => {
    const s = make();
    s.seedDrivers(drivers);
    const n = s.get().violations.length;
    s.seedDrivers(drivers);
    expect(s.get().violations).toHaveLength(n);
  });
});
