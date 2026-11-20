import { validateCardFormat } from "@/lib/sparc/card";
import type { LogEntry } from "@/lib/sparc/types";

/* Pure helpers for the Member dashboard: pass state, parking history, suggestion rules, routing. */

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_DAYS = 7;

export type PassState = { kind: "pending" | "active" | "expiring" | "expired"; daysLeft: number };

/** An expiry of 0 means the parking office hasn't activated a pass for this member yet. */
export function passState(expiresAt: number, now: number): PassState {
  if (expiresAt === 0) return { kind: "pending", daysLeft: 0 };
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

/** Visits grouped by the local day they started, newest day first. */
export function groupVisitsByDay(visits: Visit[]): { dayStart: number; visits: Visit[] }[] {
  const days = new Map<number, Visit[]>();
  for (const v of visits) {
    const d = new Date(v.entryAt ?? v.exitAt ?? 0);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    days.set(key, [...(days.get(key) ?? []), v]);
  }
  return [...days.entries()].sort((a, b) => b[0] - a[0]).map(([dayStart, list]) => ({ dayStart, visits: list }));
}

export type MemberNotice = { id: string; at: number; title: string; body: string; tone: "live" | "gold" | "crimson" | "neutral" };

/** What the member should know right now, worked out from their pass and visits. Nothing is stored. Newest first. */
export function memberNotices(user: { expiresAt: number; active: boolean; createdAt: number }, visits: Visit[], now: number): MemberNotice[] {
  const out: MemberNotice[] = [];
  const pass = passState(user.expiresAt, now);
  if (pass.kind === "pending") {
    out.push({ id: "pending", at: user.createdAt, tone: "gold", title: "Your pass is waiting for the parking office", body: "The office activates your semester pass and gives you your card. The gate will not let you in until then." });
  } else if (!user.active) {
    out.push({ id: "deactivated", at: now, tone: "crimson", title: "Your pass is deactivated", body: "Contact the parking office to have it switched back on." });
  } else if (pass.kind === "expired") {
    out.push({ id: "expired", at: user.expiresAt, tone: "crimson", title: "Your pass has expired", body: "See the parking office to renew it." });
  } else if (pass.kind === "expiring") {
    out.push({ id: "expiring", at: now, tone: "gold", title: `Your pass ends in ${pass.daysLeft} ${pass.daysLeft === 1 ? "day" : "days"}`, body: "Renew it at the parking office to keep parking." });
  }
  const latest = visits[0];
  if (latest?.entryAt != null && latest.exitAt == null) {
    out.push({ id: `in-${latest.entryAt}`, at: latest.entryAt, tone: "live", title: "You are parked", body: `Level ${latest.floor ?? "?"}, slot ${latest.slot ?? "?"}.` });
  } else if (latest?.exitAt != null) {
    out.push({ id: `out-${latest.exitAt}`, at: latest.exitAt, tone: "neutral", title: "You left the building", body: "Thanks for parking with SPARC." });
  }
  return out.sort((a, b) => b.at - a.at);
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

export type SignupInput = { name: string; email: string; role: string; studentId: string; nfcId: string; password: string; confirm: string };
export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

/** Field errors for the sign-up form; an empty object means it can be submitted. */
export function validateSignup(i: SignupInput): SignupErrors {
  const errors: SignupErrors = {};
  if (!i.name.trim()) errors.name = "Enter your full name as registered with the parking office.";
  const email = i.email.trim().toLowerCase();
  if (!email.endsWith(MEMBER_EMAIL_DOMAIN)) errors.email = `Use your university email (ends with ${MEMBER_EMAIL_DOMAIN}).`;
  // name+1@ and name+2@ all reach one mailbox, so aliases would let one person open many accounts.
  else if (email.split("@")[0].includes("+")) errors.email = "Use your plain university email, without a + in front of the @.";
  if (i.role !== "student" && i.role !== "personnel") errors.role = "Choose student or personnel.";
  if (!i.studentId.trim()) errors.studentId = "Enter your student or employee ID.";
  const cardError = validateCardFormat(i.nfcId);
  if (cardError) errors.nfcId = i.nfcId.trim() ? cardError : "Scan your NFC card, or type the number printed on it.";
  if (i.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (i.confirm !== i.password) errors.confirm = "Passwords don't match. Re-enter the same password.";
  return errors;
}

/**
 * What the address fragment says about the link a student just clicked in their email. Supabase puts
 * the result after the `#`: a session and `type=signup` when it worked, an `error` when it didn't.
 */
export function parseEmailLink(hash: string): "confirmed" | "expired" | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.get("error_code") === "otp_expired" || params.get("error") === "access_denied") return "expired";
  const type = params.get("type");
  if (params.get("access_token") && (type === "signup" || type === "email")) return "confirmed";
  return null;
}

/** Which kind of failed sign-in this is, so each gets its own message. */
export function classifySignInError(e: { status?: number; code?: string }): "unconfirmed" | "wrong" | "offline" {
  if (e.code === "email_not_confirmed") return "unconfirmed";
  if (typeof e.status === "number" && e.status >= 400 && e.status < 500) return "wrong";
  return "offline";
}
