import type { LogEntry } from "@/lib/sparc/types";
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

/** Average entries in each hour of the day, across the elapsed days of the month. */
export function hourlyEntries(logs: LogEntry[], m: Month, now: number): number[] {
  const days = elapsedDays(m, now);
  const sums = new Array<number>(24).fill(0);
  for (const l of logsIn(logs, m)) if (l.event === "entry") sums[new Date(l.at).getHours()]++;
  return sums.map((v) => (days ? v / days : 0));
}

export type HourFlow = { hour: number; entries: number; exits: number };

/** Average entries and exits in each hour of the day, across the elapsed days of the month. */
export function hourlyFlow(logs: LogEntry[], m: Month, now: number): HourFlow[] {
  const days = elapsedDays(m, now);
  const entries = new Array<number>(24).fill(0);
  const exits = new Array<number>(24).fill(0);
  for (const l of logsIn(logs, m)) (l.event === "entry" ? entries : exits)[new Date(l.at).getHours()]++;
  return entries.map((e, hour) => ({ hour, entries: days ? e / days : 0, exits: days ? exits[hour] / days : 0 }));
}

/**
 * Percent change in entries per elapsed day, month `index` against the month before it (index + 1 in the
 * newest-first list). Null when there is no earlier month or it had no entries, so no figure is made up.
 */
export function monthChange(logs: LogEntry[], list: Month[], index: number, now: number): number | null {
  const current = list[index];
  const previous = list[index + 1];
  if (!current || !previous) return null;
  const rate = (m: Month) => {
    const days = elapsedDays(m, now);
    return days ? logsIn(logs, m).filter((l) => l.event === "entry").length / days : 0;
  };
  const before = rate(previous);
  return before > 0 ? ((rate(current) - before) / before) * 100 : null;
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

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday first, the way the campus week reads. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function hourLabel(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

/** The monthly report as CSV rows: summary, daily flow, busiest times, violations. */
export function monthlyRows(args: { month: Month; heat: Heatmap; hourly: number[]; violations: WeekBucket[]; entries: number; daily?: DayFlow[] }): (string | number)[][] {
  const { month, heat, hourly, violations, entries, daily = [] } = args;
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
