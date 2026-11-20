/*
 * Semester calendar. A pass runs to the end of a semester (a college year has two), and the admin
 * keeps the dates up to date. Pure functions, so the dates can be checked without a screen or a database.
 */

export type Semester = {
  id: string;
  name: string;
  /** Start of the first day, local time (ms since 1970). */
  startsAt: number;
  /** End of the last day, local time (ms since 1970). */
  endsAt: number;
};

/** "2026-08-11" (a date input's value) to the start of that day. */
export function dateToStart(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/** "2026-12-19" to the very end of that day, so a semester includes its last day. */
export function dateToEnd(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** A moment as a date input's value, "2026-08-11". */
export function toDateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The semester a pass should run to: the one that ends soonest after `after`.
 * Activating uses `after = now` (this semester, or the next one if it's a break). Renewing uses
 * `after = max(now, current expiry)`, which lands on the semester after the one the pass was for.
 * Null when no semester ends after that moment (the admin has to add dates).
 */
export function passEndAfter(semesters: Semester[], after: number): Semester | null {
  let best: Semester | null = null;
  for (const s of semesters) {
    if (s.endsAt > after && (best === null || s.endsAt < best.endsAt)) best = s;
  }
  return best;
}

/** A message for the admin when the calendar can't be saved, or null when it is fine. An empty calendar is fine. */
export function validateSemesters(semesters: Semester[]): string | null {
  for (const s of semesters) {
    if (!s.name.trim()) return "Give every semester a name.";
    if (!Number.isFinite(s.startsAt) || !Number.isFinite(s.endsAt)) return `Pick a start and end date for ${s.name.trim()}.`;
    if (s.endsAt <= s.startsAt) return `${s.name.trim()} must end after it starts.`;
  }
  const sorted = [...semesters].sort((a, b) => a.startsAt - b.startsAt);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startsAt <= sorted[i - 1].endsAt) return `${sorted[i - 1].name.trim()} and ${sorted[i].name.trim()} overlap. Each semester must start after the one before it ends.`;
  }
  return null;
}

/**
 * Example dates for the development demo only (August to December, then January to May). The real
 * database starts empty: the admin enters the real dates, and nothing is guessed on their behalf.
 */
export function defaultSemesters(now: number): Semester[] {
  const d = new Date(now);
  // From June on, the next school year starts in August; before that, this school year began last August.
  const startYear = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  return [
    { id: "demo-sem-1", name: "1st Semester", startsAt: dateToStart(`${startYear}-08-11`), endsAt: dateToEnd(`${startYear}-12-19`) },
    { id: "demo-sem-2", name: "2nd Semester", startsAt: dateToStart(`${startYear + 1}-01-12`), endsAt: dateToEnd(`${startYear + 1}-05-22`) },
  ];
}
