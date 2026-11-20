import { describe, expect, it } from "vitest";
import { buildProfile, clock, forecastDecks, hasHistory, sampleHistory, statusFor } from "./forecast";
import type { FloorConfig, LogEntry } from "@/lib/sparc/types";

const config: FloorConfig[] = [
  { floor: 1, slots: 4 },
  { floor: 2, slots: 4 },
];

// Monday 16 Nov 2026 is "now"; past Mondays are 9 Nov, 2 Nov ...
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m, d, h, min).getTime();
const NOW = at(2026, 10, 16, 7, 0);

function entry(floor: number, when: number, event: "entry" | "exit", id: string): LogEntry {
  return { id, visitId: id, at: when, event, nfcId: "", userId: null, userName: null, slot: null, floor };
}

/** `cars` cars arrive on `floor` at `h:min` on the given day and stay until `outH`. */
function wave(floor: number, day: Date, cars: number, h: number, min: number, outH: number, tag: string): LogEntry[] {
  const out: LogEntry[] = [];
  for (let i = 0; i < cars; i++) {
    out.push(entry(floor, at(day.getFullYear(), day.getMonth(), day.getDate(), h, min), "entry", `${tag}-in-${i}`));
    out.push(entry(floor, at(day.getFullYear(), day.getMonth(), day.getDate(), outH), "exit", `${tag}-out-${i}`));
  }
  return out;
}

describe("clock", () => {
  it("formats slots as times", () => {
    expect(clock(0)).toBe("12:00 AM");
    expect(clock(31)).toBe("7:45 AM");
    expect(clock(48)).toBe("12:00 PM");
    expect(clock(95)).toBe("11:45 PM");
  });
});

describe("statusFor", () => {
  it("maps fill ratio to a status", () => {
    expect(statusFor(0.2)).toBe("available");
    expect(statusFor(0.65)).toBe("filling");
    expect(statusFor(0.9)).toBe("full");
  });
});

describe("buildProfile", () => {
  it("is empty with no history", () => {
    expect(hasHistory(buildProfile([], [1, 2], NOW))).toBe(false);
  });

  it("averages the same weekday across weeks and ignores other weekdays and today", () => {
    const mon10 = new Date(2026, 10, 9);
    const mon3 = new Date(2026, 10, 2);
    const tue11 = new Date(2026, 10, 10);
    const today = new Date(2026, 10, 16);
    const logs = [
      ...wave(1, mon10, 4, 7, 40, 12, "a"), // 4 cars from 7:40
      ...wave(1, mon3, 2, 7, 40, 12, "b"), // 2 cars from 7:40
      ...wave(1, tue11, 4, 7, 40, 12, "c"), // a Tuesday: must not count for Monday
      ...wave(1, today, 4, 7, 40, 12, "d"), // today: must not count
    ];
    const row = buildProfile(logs, [1], NOW).get(1)![1];
    const slot = Math.floor((7 * 60 + 45) / 15); // 7:45, after both waves arrived
    expect(row[slot]).toBe(3); // (4 + 2) / 2 days
    expect(new Date(NOW).getDay()).toBe(1); // sanity: the fixture date really is a Monday
    expect(row[0]).toBe(0);
    expect(buildProfile(logs, [1], NOW).get(1)![2][slot]).toBe(4); // Tuesday has its own row
  });

  it("drops history older than four weeks", () => {
    const old = new Date(2026, 9, 5); // a Monday, 6 weeks before now (Oct 5)
    const row = buildProfile(wave(1, old, 4, 7, 40, 12, "x"), [1], NOW).get(1)![1];
    expect(row.every((v) => v === null)).toBe(true);
  });
});

describe("forecastDecks", () => {
  const history = [
    ...wave(1, new Date(2026, 10, 9), 4, 7, 40, 17, "a"), // floor 1 full from 7:40
    ...wave(2, new Date(2026, 10, 9), 1, 9, 0, 17, "b"), // floor 2 nearly empty
  ];
  const decks = forecastDecks(buildProfile(history, [1, 2], NOW), config, NOW);

  it("says when a deck usually fills", () => {
    expect(decks[0].usuallyFullBy).toBe("7:45 AM");
    expect(decks[0].message).toBe("Level 1 usually fills by 7:45 AM on Mondays.");
  });

  it("rates the next hour from the busiest upcoming slot", () => {
    expect(decks[0].status).toBe("full"); // 7:00-8:00 window reaches full
    expect(decks[1].status).toBe("available");
    expect(decks[1].usuallyFullBy).toBeNull();
    expect(decks[1].message).toBe("Level 2 doesn't usually fill on Mondays.");
  });

  it("says history is missing instead of guessing", () => {
    const empty = forecastDecks(buildProfile([], [1, 2], NOW), config, NOW);
    expect(empty[0].message).toBe("Not enough history yet.");
    expect(empty[0].status).toBe("available");
  });

  it("talks about the past once the fill time has gone by", () => {
    const afternoon = at(2026, 10, 16, 14, 0);
    const later = forecastDecks(buildProfile(history, [1, 2], afternoon), config, afternoon);
    expect(later[0].message).toBe("Level 1 usually filled by 7:45 AM today.");
  });
});

describe("sampleHistory", () => {
  it("makes paired entries and exits, so occupancy never goes negative", () => {
    const logs = sampleHistory(config, NOW, 14);
    expect(logs.filter((l) => l.event === "entry").length).toBe(logs.filter((l) => l.event === "exit").length);
    expect(logs.every((l) => l.at < NOW)).toBe(true);
    expect(hasHistory(buildProfile(logs, [1, 2], NOW))).toBe(true);
  });

  it("gives the lower deck more traffic on a weekday", () => {
    const logs = sampleHistory([{ floor: 1, slots: 20 }, { floor: 2, slots: 20 }], NOW, 14);
    const weekdayEntries = (floor: number) => logs.filter((l) => l.event === "entry" && l.floor === floor && ![0, 6].includes(new Date(l.at).getDay())).length;
    expect(weekdayEntries(1)).toBeGreaterThan(weekdayEntries(2));
  });

  it("fills the lowest deck on a weekday morning but not the top one", () => {
    const big: FloorConfig[] = [1, 2, 3, 4, 5].map((floor) => ({ floor, vehicle: floor < 3 ? "heavy" : "light", slots: 22 }));
    const logs = sampleHistory(big, NOW, 28);
    const decks = forecastDecks(buildProfile(logs, [1, 2, 3, 4, 5], NOW), big, NOW);
    expect(decks[0].usuallyFullBy).not.toBeNull();
    expect(decks[4].usuallyFullBy).toBeNull();
    expect(decks[0].ratio).toBeGreaterThan(decks[4].ratio);
  });
});
