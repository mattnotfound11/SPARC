import { describe, expect, it } from "vitest";
import { noticesFor } from "./notifications";
import type { PortalState, Violation } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 10, 16, 10).getTime();
const CARD = "123456789012";
const free = { light: 0, heavy: 0 };
const empty = (): PortalState => ({ vehicles: [], activeVehicle: {}, violations: [], appeals: [], passes: [] });
const v = (id: string, status: Violation["status"], daysAgo: number, decided?: number): Violation => ({
  id,
  ownerCard: CARD,
  type: "overstay",
  at: now - daysAgo * DAY,
  status,
  ...(decided === undefined ? {} : { reviewedAt: now - decided * DAY }),
});

describe("noticesFor", () => {
  it("is empty when nothing has happened", () => {
    expect(noticesFor(empty(), CARD, free, now)).toEqual([]);
  });

  it("announces a flag, then the decision, newest first", () => {
    const s = { ...empty(), violations: [v("a", "dismissed", 5, 3)], appeals: [{ id: "x", violationId: "a", note: "ok ok ok ok ok", createdAt: now - 4 * DAY }] };
    const titles = noticesFor(s, CARD, free, now).map((n) => n.title);
    expect(titles).toEqual(["Appeal upheld", "Overstay flagged"]);
  });

  it("warns at two strikes and suspends at three", () => {
    const two = { ...empty(), violations: [v("a", "confirmed", 20, 19), v("b", "confirmed", 10, 9)] };
    expect(noticesFor(two, CARD, free, now).some((n) => n.title === "One strike from suspension")).toBe(true);
    const three = { ...two, violations: [...two.violations, v("c", "confirmed", 3, 2)] };
    const t = noticesFor(three, CARD, free, now);
    expect(t.some((n) => n.title === "Card suspended")).toBe(true);
    expect(t.some((n) => n.title === "One strike from suspension")).toBe(false);
  });

  it("only alerts the card it is asked about", () => {
    const s = { ...empty(), violations: [{ ...v("a", "open", 1), ownerCard: "999999999999" }] };
    expect(noticesFor(s, CARD, free, now)).toEqual([]);
  });

  it("tells the host when a guest arrives, and when a waitlisted bay opens", () => {
    const s: PortalState = {
      ...empty(),
      passes: [{ id: "p", code: "C", hostCard: CARD, guestName: "Maria", plate: "ABC 1234", date: now, purpose: "x", createdAt: now - DAY, usedAt: now - 1000 }],
      waitlist: [{ id: "w", ownerCard: CARD, vehicle: "light", createdAt: now - 2000 }],
    };
    expect(noticesFor(s, CARD, { light: 0, heavy: 3 }, now).map((n) => n.title)).toEqual(["Maria arrived"]);
    expect(noticesFor(s, CARD, { light: 2, heavy: 0 }, now).map((n) => n.title)).toContain("A bay is free");
  });
});
