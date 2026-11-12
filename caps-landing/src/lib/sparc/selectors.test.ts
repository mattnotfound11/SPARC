import { describe, expect, it } from "vitest";
import { passStatus } from "./selectors";
import type { RegisteredUser } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-10T08:00:00").getTime();

const u = (daysLeft: number, active = true): RegisteredUser => ({
  id: "U-1",
  nfcId: "04:A1:B2:C3",
  name: "A",
  role: "student",
  vehicle: "light",
  active,
  createdAt: 0,
  expiresAt: NOW + daysLeft * DAY,
});

describe("passStatus", () => {
  it("is active with plenty of time", () => expect(passStatus(u(20), NOW)).toEqual({ state: "active", daysLeft: 20 }));
  it("turns expiring at 5 days", () => expect(passStatus(u(5), NOW)).toEqual({ state: "expiring", daysLeft: 5 }));
  it("is still active at 6 days", () => expect(passStatus(u(6), NOW).state).toBe("active"));
  it("is expired past the expiry", () => expect(passStatus(u(-1), NOW)).toEqual({ state: "expired", daysLeft: 0 }));
  it("is suspended when the account is inactive", () => expect(passStatus(u(20, false), NOW).state).toBe("suspended"));
});
