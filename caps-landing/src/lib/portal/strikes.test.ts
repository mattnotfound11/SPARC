import { describe, expect, it } from "vitest";
import { standingFor } from "./strikes";
import type { Violation } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 16, 9);
const v = (status: Violation["status"], daysAgo: number, card = "A"): Violation => ({
  id: `${status}${daysAgo}${card}`,
  ownerCard: card,
  type: "overstay",
  at: now - daysAgo * DAY,
  status,
  reviewedAt: now - daysAgo * DAY,
});

describe("standingFor", () => {
  it("counts only confirmed violations", () => {
    const s = standingFor([v("confirmed", 5), v("open", 3), v("dismissed", 2), v("appealed", 1)], "A");
    expect(s.strikes).toBe(1);
    expect(s.suspended).toBe(false);
  });

  it("ignores other cards, and strikes never expire on their own", () => {
    const s = standingFor([v("confirmed", 5, "B"), v("confirmed", 400), v("confirmed", 10)], "A");
    expect(s.strikes).toBe(2);
  });

  it("suspends at three strikes", () => {
    expect(standingFor([v("confirmed", 60), v("confirmed", 30), v("confirmed", 2)], "A").suspended).toBe(true);
  });

  it("starts counting again after an admin clears the suspension", () => {
    const list = [v("confirmed", 60), v("confirmed", 30), v("confirmed", 2), v("confirmed", 0)];
    const cleared = now - 1 * DAY;
    const s = standingFor(list, "A", cleared);
    expect(s.strikes).toBe(1);
    expect(s.suspended).toBe(false);
  });
});
