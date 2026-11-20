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

export const MEMBER_EMAIL_DOMAIN = "@usa.edu.ph";
export const MIN_PASSWORD = 8;

export type SignupInput = { name: string; email: string; role: string; studentId: string; password: string; confirm: string };
export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

/** Field errors for the sign-up form; an empty object means it can be submitted. */
export function validateSignup(i: SignupInput): SignupErrors {
  const errors: SignupErrors = {};
  if (!i.name.trim()) errors.name = "Enter your full name as registered with the parking office.";
  if (!i.email.trim().toLowerCase().endsWith(MEMBER_EMAIL_DOMAIN)) errors.email = `Use your university email (ends with ${MEMBER_EMAIL_DOMAIN}).`;
  if (i.role !== "student" && i.role !== "personnel") errors.role = "Choose student or personnel.";
  if (!i.studentId.trim()) errors.studentId = "Enter your student or employee ID.";
  if (i.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (i.confirm !== i.password) errors.confirm = "Passwords don't match. Re-enter the same password.";
  return errors;
}
