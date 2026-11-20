import { describe, expect, it } from "vitest";
import type { LogEntry } from "@/lib/sparc/types";
import { buildVisits, homeFor, passState, SUGGESTION_MAX, validateSignup, validateSuggestion } from "./logic";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-20T10:00:00").getTime();

const log = (o: Partial<LogEntry> & Pick<LogEntry, "id" | "event" | "at">): LogEntry => ({
  visitId: null, nfcId: "1", userId: "u1", userName: "A", slot: "1A", floor: 1, vehicle: "light", ...o,
});

describe("passState", () => {
  it("is expired at or past the expiry time", () => {
    expect(passState(NOW, NOW)).toEqual({ kind: "expired", daysLeft: 0 });
    expect(passState(NOW - DAY, NOW).kind).toBe("expired");
  });
  it("is expiring with one day left (expires later today)", () => {
    expect(passState(NOW + 60_000, NOW)).toEqual({ kind: "expiring", daysLeft: 1 });
  });
  it("is expiring at exactly 7 days and active at 8", () => {
    expect(passState(NOW + 7 * DAY, NOW).kind).toBe("expiring");
    expect(passState(NOW + 8 * DAY, NOW)).toEqual({ kind: "active", daysLeft: 8 });
  });
});

describe("buildVisits", () => {
  it("pairs an entry and its exit by visit id, newest first", () => {
    const visits = buildVisits([
      log({ id: "1", visitId: "a", event: "entry", at: 100 }),
      log({ id: "2", visitId: "a", event: "exit", at: 200 }),
      log({ id: "3", visitId: "b", event: "entry", at: 300, slot: "2B", floor: 2, gate: "North" }),
    ]);
    expect(visits.map((v) => v.visitId)).toEqual(["b", "a"]);
    expect(visits[1]).toMatchObject({ entryAt: 100, exitAt: 200, slot: "1A" });
    expect(visits[0]).toMatchObject({ entryAt: 300, exitAt: null, floor: 2, gate: "North" });
  });
  it("keeps an exit with no entry and entries without a visit id as their own rows", () => {
    const visits = buildVisits([
      log({ id: "1", visitId: "x", event: "exit", at: 50 }),
      log({ id: "2", visitId: null, event: "entry", at: 60 }),
      log({ id: "3", visitId: null, event: "entry", at: 70 }),
    ]);
    expect(visits).toHaveLength(3);
    expect(visits.find((v) => v.visitId === "x")).toMatchObject({ entryAt: null, exitAt: 50 });
  });
  it("returns an empty list for no logs", () => expect(buildVisits([])).toEqual([]));
});

describe("validateSuggestion", () => {
  it("rejects empty and whitespace-only messages", () => {
    expect(validateSuggestion("Parking", "")).toBeTruthy();
    expect(validateSuggestion("Parking", "   \n ")).toBeTruthy();
  });
  it("rejects messages over the cap and unknown categories", () => {
    expect(validateSuggestion("Parking", "x".repeat(SUGGESTION_MAX + 1))).toBeTruthy();
    expect(validateSuggestion("Food", "hello")).toBeTruthy();
  });
  it("accepts a valid suggestion", () => {
    expect(validateSuggestion("Safety", "More lighting on floor 3")).toBeNull();
    expect(validateSuggestion("Pass or billing", "x".repeat(SUGGESTION_MAX))).toBeNull();
  });
});

describe("homeFor", () => {
  it("sends staff to the console and members to their page", () => {
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("facilitator")).toBe("/admin");
    expect(homeFor("member")).toBe("/member");
  });
});

describe("validateSignup", () => {
  const ok = { name: "Ana Reyes", email: "ana@usa.edu.ph", role: "student", studentId: "2024-10037", password: "longenough1", confirm: "longenough1" };
  it("accepts a complete university sign-up", () => expect(validateSignup(ok)).toEqual({}));
  it("requires a usa.edu.ph email, ignoring case and spaces", () => {
    expect(validateSignup({ ...ok, email: "ana@gmail.com" }).email).toBeTruthy();
    expect(validateSignup({ ...ok, email: "  ANA@USA.EDU.PH " }).email).toBeUndefined();
    expect(validateSignup({ ...ok, email: "ana@usa.edu.ph.evil.com" }).email).toBeTruthy();
  });
  it("requires name, ID and a student or personnel role", () => {
    expect(validateSignup({ ...ok, name: "  " }).name).toBeTruthy();
    expect(validateSignup({ ...ok, studentId: "" }).studentId).toBeTruthy();
    expect(validateSignup({ ...ok, role: "visitor" }).role).toBeTruthy();
  });
  it("needs an 8+ character password that matches its confirmation", () => {
    expect(validateSignup({ ...ok, password: "short", confirm: "short" }).password).toBeTruthy();
    expect(validateSignup({ ...ok, confirm: "different1" }).confirm).toBeTruthy();
  });
});
