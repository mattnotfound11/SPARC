import type { FloorConfig, LogEntry } from "@/lib/sparc/types";
import type { Violation, ViolationType } from "@/lib/portal/types";

/*
 * Admin analytics, as pure functions over the entry/exit log and the violation list. The backend can
 * replace any of these with a query that returns the same shapes.
 */

const DAY = 24 * 60 * 60 * 1000;

export type Month = { key: string; label: string; start: number; end: number };

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** The current month and the ones before it, newest first. */
export function months(now: number, count = 6): Month[] {
  const base = new Date(now);
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 1);
    return {
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: start.toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
      start: start.getTime(),
      end: end.getTime(),
    };
  });
}

export const logsIn = (logs: LogEntry[], m: Month) => logs.filter((l) => l.at >= m.start && l.at < m.end);

/** The days of the month that have started, so a half-finished month isn't averaged over days that haven't happened. */
function elapsedDays(m: Month, now: number) {
  const last = Math.min(m.end, startOfDay(now) + DAY);
  return Math.max(0, Math.round((last - m.start) / DAY));
}

/** How many times each weekday (0 = Sunday) occurs among the elapsed days of the month. */
function weekdayCounts(m: Month, now: number) {
  const counts = new Array<number>(7).fill(0);
  const days = elapsedDays(m, now);
  for (let i = 0; i < days; i++) counts[new Date(m.start + i * DAY + DAY / 2).getDay()]++;
  return counts;
}

export type Heatmap = {
  /** grid[weekday][hour] = average entries in that hour on that weekday. */
  grid: number[][];
  max: number;
  peak: { weekday: number; hour: number; average: number } | null;
};

export function weekdayHour(logs: LogEntry[], m: Month, now: number): Heatmap {
  const counts = weekdayCounts(m, now);
  const sums = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const l of logsIn(logs, m)) {
    if (l.event !== "entry") continue;
    const d = new Date(l.at);
    sums[d.getDay()][d.getHours()]++;
  }
  const grid = sums.map((row, weekday) => row.map((v) => (counts[weekday] ? v / counts[weekday] : 0)));
  let peak: Heatmap["peak"] = null;
  grid.forEach((row, weekday) =>
    row.forEach((average, hour) => {
      if (average > 0 && (!peak || average > peak.average)) peak = { weekday, hour, average };
    }),
  );
  return { grid, max: peak ? (peak as { average: number }).average : 0, peak };
}

export type DeckStat = {
  floor: number;
  entries: number;
  /** Entries per bay per day: how many times each bay was used on an average day. */
  turnover: number;
};

export function deckStats(logs: LogEntry[], config: FloorConfig[], m: Month, now: number): DeckStat[] {
  const inMonth = logsIn(logs, m);
  const days = elapsedDays(m, now);
  return config.map(({ floor, slots }) => {
    const entries = inMonth.filter((l) => l.event === "entry" && l.floor === floor).length;
    return {
      floor,
      entries,
      turnover: days && slots ? entries / slots / days : 0,
    };
  });
}

/** Average entries in each hour of the day, across the elapsed days of the month. */
export function hourlyEntries(logs: LogEntry[], m: Month, now: number): number[] {
  const days = elapsedDays(m, now);
  const sums = new Array<number>(24).fill(0);
  for (const l of logsIn(logs, m)) if (l.event === "entry") sums[new Date(l.at).getHours()]++;
  return sums.map((v) => (days ? v / days : 0));
}

export type DayFlow = { start: number; label: string; entries: number; exits: number };

/** Entries and exits on each day of the month that has started, oldest first (zero days included). */
export function dailyFlow(logs: LogEntry[], m: Month, now: number): DayFlow[] {
  const days = elapsedDays(m, now);
  const out: DayFlow[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(m.start);
    d.setDate(d.getDate() + i);
    return { start: d.getTime(), label: String(d.getDate()), entries: 0, exits: 0 };
  });
  for (const l of logsIn(logs, m)) {
    const day = out.findLast((d) => d.start <= l.at);
    if (!day || l.at >= day.start + DAY + DAY / 24) continue;
    if (l.event === "entry") day.entries++;
    else day.exits++;
  }
  return out;
}

export type WeekBucket = { start: number; label: string; counts: Record<ViolationType, number>; total: number };

/** Violations per week (weeks start Monday), the last `weeks` of them, oldest first. */
export function violationWeeks(violations: Violation[], now: number, weeks = 8): WeekBucket[] {
  const today = new Date(startOfDay(now));
  const sinceMonday = (today.getDay() + 6) % 7;
  const thisMonday = today.getTime() - sinceMonday * DAY;
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const start = thisMonday - (weeks - 1 - i) * 7 * DAY;
    return {
      start,
      label: new Date(start).toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
      counts: { overstay: 0, overnight: 0, "anti-passback": 0, temporary: 0 },
      total: 0,
    };
  });
  for (const v of violations) {
    const bucket = buckets.find((b) => v.at >= b.start && v.at < b.start + 7 * DAY);
    if (!bucket) continue;
    bucket.counts[v.type]++;
    bucket.total++;
  }
  return buckets;
}

export type GateStat = { gate: string; entries: number; exits: number; peakHour: number | null; peakAverage: number; perHour: number[] };

/** Throughput per gate for a month. Logs with no gate recorded are left out; they are counted in `unassigned`. */
export function gateStats(logs: LogEntry[], m: Month, now: number): { gates: GateStat[]; unassigned: number } {
  const days = elapsedDays(m, now);
  const byGate = new Map<string, { entries: number; exits: number; sums: number[] }>();
  let unassigned = 0;
  for (const l of logsIn(logs, m)) {
    if (!l.gate) {
      unassigned++;
      continue;
    }
    const g = byGate.get(l.gate) ?? { entries: 0, exits: 0, sums: new Array<number>(24).fill(0) };
    if (l.event === "entry") {
      g.entries++;
      g.sums[new Date(l.at).getHours()]++;
    } else g.exits++;
    byGate.set(l.gate, g);
  }
  const gates = [...byGate.entries()]
    .map(([gate, g]) => {
      const perHour = g.sums.map((v) => (days ? v / days : 0));
      const peak = Math.max(0, ...perHour);
      return { gate, entries: g.entries, exits: g.exits, peakHour: peak > 0 ? perHour.indexOf(peak) : null, peakAverage: peak, perHour };
    })
    .sort((a, b) => b.entries + b.exits - (a.entries + a.exits));
  return { gates, unassigned };
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday first, the way the campus week reads. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function hourLabel(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

/** The monthly report as CSV rows: summary, daily flow, busiest times, decks, gates, violations. */
export function monthlyRows(args: { month: Month; heat: Heatmap; decks: DeckStat[]; hourly: number[]; violations: WeekBucket[]; entries: number; gates?: GateStat[]; daily?: DayFlow[] }): (string | number)[][] {
  const { month, heat, decks, hourly, violations, entries, gates = [], daily = [] } = args;
  const peak = heat.peak ? `${WEEKDAYS[heat.peak.weekday]} ${hourLabel(heat.peak.hour)} (${heat.peak.average.toFixed(1)} entries on average)` : "n/a";
  const rows: (string | number)[][] = [
    ["SPARC monthly report", month.label],
    [],
    ["Total entries", entries],
    ["Busiest time", peak],
    [],
    ["Day", "Entries", "Exits"],
    ...daily.map((d) => [d.label, d.entries, d.exits]),
    [],
    ["Deck", "Entries", "Bay turnover (entries per bay per day)"],
    ...decks.map((d) => [`Level ${d.floor}`, d.entries, Number(d.turnover.toFixed(2))]),
    [],
    ["Gate", "Entries", "Exits", "Busiest hour"],
    ...gates.map((g) => [g.gate, g.entries, g.exits, g.peakHour === null ? "" : hourLabel(g.peakHour)]),
    [],
    ["Hour", "Average entries per day"],
    ...hourly.map((v, h) => [hourLabel(h), Number(v.toFixed(2))]).filter((r) => (r[1] as number) > 0),
    [],
    ["Weekday", ...Array.from({ length: 24 }, (_, h) => hourLabel(h))],
    ...WEEK_ORDER.map((w) => [WEEKDAYS[w], ...heat.grid[w].map((v) => Number(v.toFixed(2)))]),
    [],
    ["Week starting", "Overstay", "Overnight", "Second entry without exit", "Temporary vehicle entry", "Total"],
    ...violations.map((b) => [b.label, b.counts.overstay, b.counts.overnight, b.counts["anti-passback"], b.counts.temporary, b.total]),
  ];
  return rows;
}
