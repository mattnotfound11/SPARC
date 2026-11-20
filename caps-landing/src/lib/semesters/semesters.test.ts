import { describe, expect, it } from "vitest";
import { dateToEnd, dateToStart, defaultSemesters, passEndAfter, toDateInput, validateSemesters, type Semester } from "./semesters";

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

const SEM1: Semester = { id: "s1", name: "1st Semester", startsAt: dateToStart("2026-08-11"), endsAt: dateToEnd("2026-12-19") };
const SEM2: Semester = { id: "s2", name: "2nd Semester", startsAt: dateToStart("2027-01-12"), endsAt: dateToEnd("2027-05-22") };
const SEMS = [SEM2, SEM1]; // deliberately out of order

describe("date helpers", () => {
  it("a semester covers its whole first and last day, in local time", () => {
    expect(dateToStart("2026-08-11")).toBe(new Date(2026, 7, 11, 0, 0, 0, 0).getTime());
    expect(dateToEnd("2026-12-19")).toBe(new Date(2026, 11, 19, 23, 59, 59, 999).getTime());
  });
  it("round-trips through the date input format", () => {
    expect(toDateInput(dateToStart("2026-08-11"))).toBe("2026-08-11");
    expect(toDateInput(dateToEnd("2027-05-22"))).toBe("2027-05-22");
  });
});

describe("passEndAfter", () => {
  it("gives the end of the current semester when activating during it", () => {
    expect(passEndAfter(SEMS, day(2026, 10, 5))).toMatchObject({ name: "1st Semester", endsAt: SEM1.endsAt });
  });
  it("still counts the last day of a semester as in it", () => {
    expect(passEndAfter(SEMS, day(2026, 12, 19, 18))).toMatchObject({ name: "1st Semester" });
  });
  it("gives the next semester's end when activating in the break or before the first semester", () => {
    expect(passEndAfter(SEMS, day(2026, 12, 25))).toMatchObject({ name: "2nd Semester", endsAt: SEM2.endsAt });
    expect(passEndAfter(SEMS, day(2026, 6, 1))).toMatchObject({ name: "1st Semester" });
  });
  it("renewing an active pass goes to the next semester: ask after the current expiry", () => {
    expect(passEndAfter(SEMS, SEM1.endsAt)).toMatchObject({ name: "2nd Semester" });
  });
  it("is null when no semester ends after that moment, or there are none", () => {
    expect(passEndAfter(SEMS, day(2027, 6, 1))).toBeNull();
    expect(passEndAfter([], day(2026, 10, 5))).toBeNull();
  });
});

describe("validateSemesters", () => {
  it("accepts a clean calendar and an empty one", () => {
    expect(validateSemesters(SEMS)).toBeNull();
    expect(validateSemesters([])).toBeNull();
  });
  it("rejects a blank name, a backwards range, and overlaps", () => {
    expect(validateSemesters([{ ...SEM1, name: "  " }])).toMatch(/name/i);
    expect(validateSemesters([{ ...SEM1, endsAt: SEM1.startsAt - 1 }])).toMatch(/after/i);
    expect(validateSemesters([SEM1, { ...SEM2, startsAt: SEM1.endsAt - 1000 }])).toMatch(/overlap/i);
  });
});

describe("defaultSemesters (dev demo only)", () => {
  it("makes two semesters of the current school year, valid and in order", () => {
    const list = defaultSemesters(day(2026, 10, 5));
    expect(list).toHaveLength(2);
    expect(validateSemesters(list)).toBeNull();
    expect(passEndAfter(list, day(2026, 10, 5))).not.toBeNull();
    // in the second half of the school year it still covers today
    const spring = defaultSemesters(day(2027, 3, 1));
    expect(passEndAfter(spring, day(2027, 3, 1))).toMatchObject({ name: "2nd Semester" });
  });
});
