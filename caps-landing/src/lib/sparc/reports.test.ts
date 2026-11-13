import { describe, expect, it } from "vitest";
import { createSparcStore } from "./store";
import { combineReports, dayRangeFor, dayRanges, dayReport, parseDateKey } from "./selectors";
import type { LogEntry } from "./types";

const NOW = new Date("2026-11-13T15:30:00").getTime();
const at = (iso: string) => new Date(iso).getTime();
let n = 0;
const log = (iso: string, event: LogEntry["event"]): LogEntry => ({
  id: `L-${++n}`,
  visitId: null,
  at: at(iso),
  event,
  nfcId: "04:A1:B2:C3",
  userId: "U-1",
  userName: "A",
  slot: "C1",
  floor: 3,
  vehicle: "light",
});

const state = {
  ...createSparcStore(NOW).getState(),
  now: NOW,
  logs: [
    log("2026-11-13T09:10:00", "entry"),
    log("2026-11-13T09:40:00", "entry"),
    log("2026-11-13T11:00:00", "exit"),
    log("2026-11-10T08:15:00", "entry"),
    log("2026-11-10T08:20:00", "entry"),
    log("2026-11-10T08:30:00", "entry"),
    log("2026-11-01T10:00:00", "entry"),
  ],
};

describe("dayRangeFor", () => {
  it("labels days relative to now", () => {
    expect(dayRangeFor(at("2026-11-13T00:00:00"), NOW).label).toBe("Today");
    expect(dayRangeFor(at("2026-11-12T23:59:00"), NOW).label).toBe("Yesterday");
    expect(dayRangeFor(at("2026-11-01T12:00:00"), NOW)).toMatchObject({ key: "2026-11-01", label: "Sun, Nov 1" });
  });
  it("spans exactly one local day", () => {
    const r = dayRangeFor(at("2026-11-10T17:00:00"), NOW);
    expect([r.start, r.end]).toEqual([at("2026-11-10T00:00:00"), at("2026-11-11T00:00:00")]);
  });
  it("adds the year for dates in another year", () => expect(dayRangeFor(at("2025-12-31T10:00:00"), NOW).label).toMatch(/2025/));
});

describe("parseDateKey", () => {
  it("reads a date input value as a local day", () => expect(parseDateKey("2026-11-01")?.getTime()).toBe(at("2026-11-01T00:00:00")));
  it("rejects junk and impossible dates", () => {
    expect(parseDateKey("")).toBeNull();
    expect(parseDateKey("2026-02-30")).toBeNull();
    expect(parseDateKey("11/01/2026")).toBeNull();
  });
});

describe("reports", () => {
  it("finds a picked date older than the last 7 days", () => {
    const r = dayReport(state, dayRangeFor(parseDateKey("2026-11-01")!, NOW));
    expect([r.entries, r.exits]).toEqual([1, 0]);
  });

  it("combines the last week: sums, busiest hour per hour, and the peak day", () => {
    const week = combineReports(dayRanges(NOW).map((d) => dayReport(state, d)), "Last week");
    expect(week.range).toMatchObject({ label: "Last week", start: at("2026-11-07T00:00:00"), end: at("2026-11-14T00:00:00") });
    expect([week.entries, week.exits]).toEqual([5, 1]); // Nov 1 is outside the week
    expect(week.hourly[9].entries).toBe(2);
    expect(week.hourly[8].occupancy).toBe(3); // busiest 8 AM on any day (Nov 10)
    expect(week.peakOccupancy).toBe(3);
    expect(week.peakDay?.key).toBe("2026-11-10");
    expect(week.peakHour).toBe(8);
  });
});
