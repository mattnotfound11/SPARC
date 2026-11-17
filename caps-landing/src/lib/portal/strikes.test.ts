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
    const s = standingFor([v("confirmed", 5), v("open", 3), v("dismissed", 2), v("appealed", 1)], "A", now);
    expect(s.strikes).toBe(1);
    expect(s.suspended).toBe(false);
  });

  it("ignores other cards and strikes older than 90 days", () => {
    const s = standingFor([v("confirmed", 5, "B"), v("confirmed", 91), v("confirmed", 10)], "A", now);
    expect(s.strikes).toBe(1);
  });

  it("suspends at three strikes and reports when the oldest expires", () => {
    const s = standingFor([v("confirmed", 60), v("confirmed", 30), v("confirmed", 2)], "A", now);
    expect(s.suspended).toBe(true);
    expect(s.nextExpiry).toBe(now - 60 * DAY + 90 * DAY);
  });
});
