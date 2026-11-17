import { describe, expect, it } from "vitest";
import { deckStats, formatStay, hourlyEntries, logsIn, monthlyRows, months, violationWeeks, weekdayHour } from "./analytics";
import type { FloorConfig, LogEntry } from "@/lib/sparc/types";
import type { Violation } from "@/lib/portal/types";

const config: FloorConfig[] = [
  { floor: 1, vehicle: "heavy", slots: 10 },
  { floor: 2, vehicle: "light", slots: 10 },
];
const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m, d, h, min).getTime();

// Tuesday 17 Nov 2026, evening: 17 days of November have started
const NOW = at(10, 17, 20);
const nov = months(NOW)[0];

function log(id: string, when: number, event: "entry" | "exit", floor: number): LogEntry {
  return { id: `${id}-${event}`, visitId: id, at: when, event, nfcId: "", userId: null, userName: null, slot: null, floor, vehicle: null };
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

describe("deckStats", () => {
  const logs = [
    ...visit("a", 1, at(10, 3, 8), at(10, 3, 10)), // 120 min
    ...visit("b", 1, at(10, 4, 8), at(10, 4, 9)), // 60 min
    ...visit("c", 2, at(10, 5, 8), at(10, 5, 8, 30)), // 30 min
    log("open", at(10, 6, 8), "entry", 2), // still inside: no stay yet
  ];
  const stats = deckStats(logs, config, nov, NOW);

  it("counts entries per deck", () => {
    expect(stats.map((s) => s.entries)).toEqual([2, 2]);
  });

  it("averages the paired stay and leaves out cars still inside", () => {
    expect(stats[0].avgStayMin).toBe(90);
    expect(stats[1].avgStayMin).toBe(30);
  });

  it("measures turnover as entries per bay per day", () => {
    expect(stats[0].turnover).toBeCloseTo(2 / 10 / 17);
  });

  it("reports no stay for a deck with no finished visits", () => {
    expect(deckStats([log("z", at(10, 3, 8), "entry", 1)], config, nov, NOW)[0].avgStayMin).toBeNull();
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
    expect(weeks[2].counts).toEqual({ overstay: 1, overnight: 1, "anti-passback": 0 });
    expect(weeks[1].counts.overstay).toBe(1); // Sunday the 15th belongs to the week of the 9th
    expect(weeks[1].counts["anti-passback"]).toBe(1);
    expect(weeks[2].total).toBe(2);
  });

  it("ignores violations older than the window", () => {
    const weeks = violationWeeks([v("old", at(8, 1, 9), "overstay")], NOW, 4);
    expect(weeks.every((w) => w.total === 0)).toBe(true);
  });
});

describe("formatStay and monthlyRows", () => {
  it("formats stays", () => {
    expect(formatStay(null)).toBe("n/a");
    expect(formatStay(45)).toBe("45 min");
    expect(formatStay(120)).toBe("2 h");
    expect(formatStay(135)).toBe("2 h 15 min");
  });

  it("builds a CSV with every section and no empty-hour noise", () => {
    const logs = visit("a", 1, at(10, 3, 8), at(10, 3, 10));
    const heat = weekdayHour(logs, nov, NOW);
    const rows = monthlyRows({ month: nov, heat, decks: deckStats(logs, config, nov, NOW), hourly: hourlyEntries(logs, nov, NOW), violations: violationWeeks([], NOW, 2), entries: 1 });
    const flat = rows.map((r) => r.join("|"));
    expect(flat[0]).toBe("SPARC monthly report|November 2026");
    expect(flat).toContain("Total entries|1");
    expect(flat.some((r) => r.startsWith("Busiest time|Tuesday 8 AM"))).toBe(true);
    expect(flat.some((r) => r.startsWith("Level 1|1|120"))).toBe(true);
    expect(flat.filter((r) => r.startsWith("8 AM|"))).toHaveLength(1);
    expect(flat.some((r) => r.startsWith("Monday|"))).toBe(true);
  });
});
