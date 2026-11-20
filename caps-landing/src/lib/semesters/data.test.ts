import { describe, expect, it } from "vitest";
import { loadSemesters, saveSemesters } from "./data";
import { dateToEnd, dateToStart, type Semester } from "./semesters";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const sem = (id: string, name: string, from: string, to: string): Semester => ({ id, name, startsAt: dateToStart(from), endsAt: dateToEnd(to) });

describe("semester storage (local demo mode)", () => {
  it("starts with example dates so the demo works, and remembers what the admin saves", async () => {
    const storage = memory();
    const first = await loadSemesters({ storage, now: new Date(2026, 9, 5).getTime() });
    expect(first.length).toBe(2);
    const mine = [sem("a", "1st Semester", "2026-08-10", "2026-12-18")];
    expect(await saveSemesters(mine, { storage })).toBeNull();
    expect(await loadSemesters({ storage })).toEqual(mine);
  });

  it("refuses overlapping dates and keeps what was saved before", async () => {
    const storage = memory();
    const good = [sem("a", "1st Semester", "2026-08-10", "2026-12-18")];
    await saveSemesters(good, { storage });
    const bad = [sem("a", "1st Semester", "2026-08-10", "2026-12-18"), sem("b", "2nd Semester", "2026-12-01", "2027-05-20")];
    expect(await saveSemesters(bad, { storage })).toMatch(/overlap/i);
    expect(await loadSemesters({ storage })).toEqual(good);
  });

  it("can be emptied, which blocks passes until dates are added again", async () => {
    const storage = memory();
    await saveSemesters([sem("a", "1st Semester", "2026-08-10", "2026-12-18")], { storage });
    expect(await saveSemesters([], { storage })).toBeNull();
    expect(await loadSemesters({ storage })).toEqual([]);
  });

  it("returns the semesters oldest first", async () => {
    const storage = memory();
    await saveSemesters([sem("b", "2nd", "2027-01-12", "2027-05-22"), sem("a", "1st", "2026-08-10", "2026-12-18")], { storage });
    expect((await loadSemesters({ storage })).map((s) => s.id)).toEqual(["a", "b"]);
  });
});
