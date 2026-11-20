import type { LogEntry } from "@/lib/sparc/types";

/* Pure helpers for the Member dashboard: pass state, parking history, suggestion rules, routing. */

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_DAYS = 7;

export type PassState = { kind: "active" | "expiring" | "expired"; daysLeft: number };

export function passState(expiresAt: number, now: number): PassState {
  if (expiresAt <= now) return { kind: "expired", daysLeft: 0 };
  const daysLeft = Math.ceil((expiresAt - now) / DAY_MS);
  return { kind: daysLeft <= EXPIRING_DAYS ? "expiring" : "active", daysLeft };
}

export type Visit = {
  visitId: string | null;
  entryAt: number | null;
  exitAt: number | null;
  floor: number | null;
  slot: string | null;
  gate?: string;
};

/** Pairs each entry with its exit; anything unpaired still shows as its own row. Newest first. */
export function buildVisits(logs: LogEntry[]): Visit[] {
  const byVisit = new Map<string, Visit>();
  const visits: Visit[] = [];
  for (const l of [...logs].sort((a, b) => a.at - b.at)) {
    let v = l.visitId ? byVisit.get(l.visitId) : undefined;
    if (!v) {
      v = { visitId: l.visitId, entryAt: null, exitAt: null, floor: l.floor, slot: l.slot };
      visits.push(v);
      if (l.visitId) byVisit.set(l.visitId, v);
    }
    if (l.event === "entry") {
      v.entryAt = l.at;
      v.floor = l.floor;
      v.slot = l.slot;
      if (l.gate) v.gate = l.gate;
    } else {
      v.exitAt = l.at;
      if (v.entryAt === null) {
        v.floor = l.floor;
        v.slot = l.slot;
      }
    }
  }
  return visits.sort((a, b) => (b.entryAt ?? b.exitAt ?? 0) - (a.entryAt ?? a.exitAt ?? 0));
}

export const SUGGESTION_CATEGORIES = ["Parking", "Safety", "Pass or billing", "Other"] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];
export const SUGGESTION_MAX = 1000;
export const SUGGESTION_DAILY_LIMIT = 5;

/** An error message for the member, or null when the suggestion is fine to send. */
export function validateSuggestion(category: string, message: string): string | null {
  if (!(SUGGESTION_CATEGORIES as readonly string[]).includes(category)) return "Choose a category.";
  const text = message.trim();
  if (!text) return "Write your suggestion first.";
  if (text.length > SUGGESTION_MAX) return `Keep it under ${SUGGESTION_MAX} characters.`;
  return null;
}

export type AccountType = "admin" | "facilitator" | "member";

export const homeFor = (type: AccountType) => (type === "member" ? "/member" : "/admin");
