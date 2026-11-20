import { describe, expect, it } from "vitest";
import { dailyFlow, hourlyEntries, hourlyFlow, logsIn, monthChange, monthlyRows, months, violationWeeks, weekdayHour } from "./analytics";
import type { LogEntry } from "@/lib/sparc/types";
import type { Violation } from "@/lib/portal/types";

const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m, d, h, min).getTime();

// Tuesday 17 Nov 2026, evening: 17 days of November have started
const NOW = at(10, 17, 20);
const nov = months(NOW)[0];

function log(id: string, when: number, event: "entry" | "exit", floor: number): LogEntry {
  return { id: `${id}-${event}`, visitId: id, at: when, event, nfcId: "", userId: null, userName: null, slot: null, floor };
}
const visit = (id: string, floor: number, from: number, to: number) => [log(id, from, "entry", floor), log(id, to, "exit", floor)];

describe("months", () => {
  it("lists the current month first, then earlier ones, with exact bounds", () => {
    const list = months(NOW, 3);
    expect(list.map((m) => m.key)).toEqual(["2026-11", "2026-10", "2026-09"]);
    expect(list[0].label).toBe("November 2026");
    expect(list[0].start).toBe(new Date(2026, 10, 1).getTime());
    expect(list[0].end).toBe(new Date(2026, 11, 1).getTime());
  });

  it("crosses a year boundary", () => {
    const list = months(at(0, 15, 9), 2);
    expect(list.map((m) => m.key)).toEqual(["2026-01", "2025-12"]);
  });

  it("filters the log to a month", () => {
    const logs = [log("a", at(9, 31, 23), "entry", 1), log("b", at(10, 1, 0), "entry", 1), log("c", at(10, 30, 23), "entry", 1), log("d", at(11, 1, 0), "entry", 1)];
    expect(logsIn(logs, nov).map((l) => l.visitId)).toEqual(["b", "c"]);
  });
});

describe("weekdayHour", () => {
  // Tuesdays in Nov 1-17: the 3rd, 10th and 17th. Mondays: 2nd, 9th, 16th.
  it("averages entries over how many of that weekday have happened", () => {
    const logs = [
      ...visit("t1", 1, at(10, 3, 8, 10), at(10, 3, 12)), // Tuesday 8am
      ...visit("t2", 1, at(10, 10, 8, 40), at(10, 10, 12)), // Tuesday 8am
      ...visit("t3", 1, at(10, 10, 8, 50), at(10, 10, 12)), // Tuesday 8am
      ...visit("m1", 1, at(10, 9, 14), at(10, 9, 16)), // Monday 2pm
    ];
    const heat = weekdayHour(logs, nov, NOW);
    expect(heat.grid[2][8]).toBe(1); // 3 entries over 3 Tuesdays
    expect(heat.grid[1][14]).toBeCloseTo(1 / 3);
    expect(heat.grid[3][8]).toBe(0);
    expect(heat.peak).toEqual({ weekday: 2, hour: 8, average: 1 });
    expect(heat.max).toBe(1);
  });

  it("ignores exits and other months, and is empty with no data", () => {
    const logs = [log("x", at(9, 20, 8), "entry", 1), log("y", at(10, 3, 9), "exit", 1)];
    const heat = weekdayHour(logs, nov, NOW);
    expect(heat.peak).toBeNull();
    expect(heat.max).toBe(0);
    expect(heat.grid.flat().every((v) => v === 0)).toBe(true);
  });

  it("does not divide by days that have not happened yet", () => {
    // Early in the month, only one Sunday (the 1st) has happened
    const early = at(10, 2, 9);
    const heat = weekdayHour([log("s", at(10, 1, 10), "entry", 1)], nov, early);
    expect(heat.grid[0][10]).toBe(1);
  });
});

describe("dailyFlow", () => {
  it("counts entries and exits on their own local day, with zero days included, oldest first", () => {
    const logs = [...visit("a", 1, at(10, 3, 23), at(10, 4, 1)), ...visit("b", 2, at(10, 4, 8), at(10, 4, 9))];
    const days = dailyFlow(logs, nov, NOW);
    expect(days[0]).toMatchObject({ label: "1", entries: 0, exits: 0 });
    expect(days[2]).toMatchObject({ label: "3", entries: 1, exits: 0 });
    expect(days[3]).toMatchObject({ label: "4", entries: 1, exits: 2 });
    expect(days[2].start).toBe(at(10, 3, 0));
  });
  it("stops at today for the current month and ignores other months", () => {
    const days = dailyFlow([...visit("x", 1, at(9, 30, 8), at(9, 30, 9))], nov, NOW);
    expect(days).toHaveLength(17);
    expect(days.every((d) => d.entries === 0 && d.exits === 0)).toBe(true);
  });
  it("covers a whole past month", () => {
    const oct = months(NOW)[1];
    expect(dailyFlow([], oct, NOW)).toHaveLength(31);
  });
});

describe("hourlyEntries", () => {
  it("averages entries per day for each hour", () => {
    const logs = [...visit("a", 1, at(10, 3, 8), at(10, 3, 9)), ...visit("b", 2, at(10, 4, 8, 30), at(10, 4, 9))];
    const hourly = hourlyEntries(logs, nov, NOW);
    expect(hourly[8]).toBeCloseTo(2 / 17);
    expect(hourly[9]).toBe(0);
  });
});

describe("violationWeeks", () => {
  const v = (id: string, when: number, type: Violation["type"]): Violation => ({ id, ownerCard: "c", type, at: when, status: "open" });

  it("buckets by week starting Monday, oldest first, and counts each type", () => {
    // Tuesday 17 Nov: this week starts Monday 16 Nov
    const weeks = violationWeeks(
      [v("1", at(10, 16, 7), "overstay"), v("2", at(10, 17, 9), "overnight"), v("3", at(10, 15, 22), "overstay"), v("4", at(10, 9, 8), "anti-passback")],
      NOW,
      3,
    );
    expect(weeks).toHaveLength(3);
    expect(weeks[2].start).toBe(new Date(2026, 10, 16).getTime());
    expect(weeks[2].counts).toEqual({ overstay: 1, overnight: 1, "anti-passback": 0, temporary: 0 });
    expect(weeks[1].counts.overstay).toBe(1); // Sunday the 15th belongs to the week of the 9th
    expect(weeks[1].counts["anti-passback"]).toBe(1);
    expect(weeks[2].total).toBe(2);
  });

  it("ignores violations older than the window", () => {
    const weeks = violationWeeks([v("old", at(8, 1, 9), "overstay")], NOW, 4);
    expect(weeks.every((w) => w.total === 0)).toBe(true);
  });
});

describe("monthlyRows", () => {
  it("builds a CSV with every section and no empty-hour noise", () => {
    const logs = visit("a", 1, at(10, 3, 8), at(10, 3, 10));
    const heat = weekdayHour(logs, nov, NOW);
    const rows = monthlyRows({ month: nov, heat, hourly: hourlyEntries(logs, nov, NOW), violations: violationWeeks([], NOW, 2), entries: 1, daily: dailyFlow(logs, nov, NOW) });
    const flat = rows.map((r) => r.join("|"));
    expect(flat[0]).toBe("SPARC monthly report|November 2026");
    expect(flat).toContain("Total entries|1");
    expect(flat.some((r) => r.startsWith("Busiest time|Tuesday 8 AM"))).toBe(true);
    expect(flat.some((r) => r.startsWith("Deck|") || r.startsWith("Level "))).toBe(false);
    expect(flat.some((r) => r.includes("Average stay"))).toBe(false);
    expect(flat).toContain("Day|Entries|Exits");
    expect(flat).toContain("3|1|1");
    expect(flat.filter((r) => r.startsWith("8 AM|"))).toHaveLength(1);
    expect(flat.some((r) => r.startsWith("Monday|"))).toBe(true);
  });
});

describe("hourlyFlow", () => {
  it("averages entries and exits per day for each of the 24 hours", () => {
    const logs = [...visit("a", 1, at(10, 3, 8), at(10, 3, 17)), ...visit("b", 2, at(10, 4, 8, 30), at(10, 4, 17, 10))];
    const flow = hourlyFlow(logs, nov, NOW);
    expect(flow).toHaveLength(24);
    expect(flow[8]).toEqual({ hour: 8, entries: 2 / 17, exits: 0 });
    expect(flow[17].exits).toBeCloseTo(2 / 17);
    expect(flow[12]).toEqual({ hour: 12, entries: 0, exits: 0 });
  });
  it("is all zeros for an empty month", () => {
    expect(hourlyFlow([], nov, NOW).every((h) => h.entries === 0 && h.exits === 0)).toBe(true);
  });
});

describe("monthChange", () => {
  const list = months(NOW);
  it("compares entries per elapsed day with the previous month", () => {
    // November: 17 elapsed days, 34 entries = 2 a day. October: 31 days, 31 entries = 1 a day.
    const logs = [
      ...Array.from({ length: 34 }, (_, i) => log(`n${i}`, at(10, 1 + (i % 17), 9), "entry", 1)),
      ...Array.from({ length: 31 }, (_, i) => log(`o${i}`, at(9, 1 + i, 9), "entry", 1)),
    ];
    expect(monthChange(logs, list, 0, NOW)).toBeCloseTo(100);
  });
  it("is null when the previous month has no entries or there is none", () => {
    expect(monthChange([log("n", at(10, 3, 9), "entry", 1)], list, 0, NOW)).toBeNull();
    expect(monthChange([], list, list.length - 1, NOW)).toBeNull();
  });
});
