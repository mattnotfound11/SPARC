import { describe, expect, it } from "vitest";
import type { SparcStorage } from "@/lib/sparc/store";
import { listAllSuggestions, listMySuggestions, loadMemberData, sendSuggestion, setSuggestionStatus } from "./data";

const memory = (): SparcStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const NOW = new Date("2026-11-20T10:00:00").getTime();

describe("member data (local sample mode)", () => {
  it("loads the demo member's own record and only their logs", async () => {
    const storage = memory();
    const data = await loadMemberData({ storage, now: NOW });
    expect(data).not.toBeNull();
    expect(data!.user.role).toBe("student");
    expect(data!.logs.every((l) => l.userId === data!.user.id)).toBe(true);
  });

  it("rejects invalid suggestions and stores valid ones newest first", async () => {
    const deps = { storage: memory(), now: NOW };
    expect(await sendSuggestion("Parking", "  ", deps)).toBeTruthy();
    expect(await sendSuggestion("Parking", "Add more lighting", deps)).toBeNull();
    expect(await sendSuggestion("Safety", "Gate camera is dark", { ...deps, now: NOW + 1000 })).toBeNull();
    const mine = await listMySuggestions(deps);
    expect(mine.map((s) => s.category)).toEqual(["Safety", "Parking"]);
    expect((await listAllSuggestions(deps)).length).toBe(2);
  });

  it("allows 5 suggestions a day and refuses the sixth", async () => {
    const deps = { storage: memory(), now: NOW };
    for (let i = 0; i < 5; i++) expect(await sendSuggestion("Other", `idea ${i}`, { ...deps, now: NOW + i })).toBeNull();
    expect(await sendSuggestion("Other", "one more", { ...deps, now: NOW + 10 })).toMatch(/5 suggestions/);
    expect(await sendSuggestion("Other", "tomorrow", { ...deps, now: NOW + 25 * 3600_000 })).toBeNull();
  });

  it("persists a status change", async () => {
    const deps = { storage: memory(), now: NOW };
    await sendSuggestion("Parking", "hello", deps);
    const [s] = await listAllSuggestions(deps);
    expect(await setSuggestionStatus(s.id, "resolved", deps)).toBeNull();
    expect((await listAllSuggestions(deps))[0].status).toBe("resolved");
  });
});
