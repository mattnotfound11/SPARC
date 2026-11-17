import { STRIKE_LIMIT, standingFor } from "./strikes";
import { TYPE_LABEL } from "./labels";
import type { PortalState } from "./types";
import type { VehicleClass } from "@/lib/sparc/types";

export type Notice = {
  id: string;
  at: number;
  title: string;
  body: string;
  tone: "live" | "gold" | "crimson" | "neutral";
};

const MAX_NOTICES = 30;

/**
 * The driver's alerts, worked out from what the portal already holds (violations, appeals, passes,
 * vehicles, the waitlist). Nothing is stored, so there is nothing to fall out of date. `free` is how
 * many bays of each class are open right now, for waitlist alerts.
 */
/** What the gate side knows about this driver. All of it is optional: a card the gate doesn't know has none. */
export type GateContext = {
  free: Record<VehicleClass, number>;
  /** When the monthly pass ends. */
  expiresAt?: number;
  /** When the car in the building came in. */
  parkedSince?: number;
  /** Levels with no free bay left. */
  fullFloors?: number[];
};

/** Hours in the building before the driver is told. Placeholder until the real overstay limit is set. */
export const LONG_STAY_HOURS = 10;
export const PASS_WARN_DAYS = 7;

export function noticesFor(state: PortalState, card: string, gate: GateContext, now = Date.now()): Notice[] {
  const free = gate.free;
  const out: Notice[] = [];
  const mine = state.violations.filter((v) => v.ownerCard === card);

  for (const v of mine) {
    const what = TYPE_LABEL[v.type].title;
    out.push({
      id: `flag-${v.id}`,
      at: v.at,
      title: `${what} flagged`,
      body: v.status === "open" ? "An admin will review it. If it looks wrong, send an appeal." : "The gate flagged this on your card.",
      tone: "gold",
    });
    if (v.reviewedAt === undefined) continue;
    const appealed = state.appeals.some((a) => a.violationId === v.id);
    if (v.status === "dismissed") {
      out.push({
        id: `dismiss-${v.id}`,
        at: v.reviewedAt,
        title: appealed ? "Appeal upheld" : "Flag dismissed",
        body: `The ${what.toLowerCase()} was cancelled. No strike.`,
        tone: "live",
      });
    } else if (v.status === "confirmed") {
      out.push({
        id: `confirm-${v.id}`,
        at: v.reviewedAt,
        title: appealed ? "Appeal rejected" : "Violation confirmed",
        body: `The ${what.toLowerCase()} stands and counts as a strike.`,
        tone: "crimson",
      });
    }
  }

  const reinstatedAt = state.reinstated?.[card] ?? 0;
  const standing = standingFor(state.violations, card, reinstatedAt);
  const lastStrike = Math.max(0, ...mine.filter((v) => v.status === "confirmed").map((v) => v.reviewedAt ?? v.at));
  if (reinstatedAt) out.push({ id: `cleared-${reinstatedAt}`, at: reinstatedAt, title: "Suspension cleared", body: "An admin cleared your card. Your strikes start again from zero.", tone: "live" });
  if (standing.suspended) {
    out.push({ id: "suspended", at: lastStrike, title: "Card suspended", body: `You have ${standing.strikes} strikes, so the card can't open the gate until an admin clears it.`, tone: "crimson" });
  } else if (standing.strikes === STRIKE_LIMIT - 1) {
    out.push({ id: "warning", at: lastStrike, title: "One strike from suspension", body: `You have ${standing.strikes} of ${STRIKE_LIMIT} strikes. One more suspends the card.`, tone: "gold" });
  }

  for (const p of state.passes.filter((x) => x.hostCard === card && x.usedAt !== undefined)) {
    out.push({ id: `pass-${p.id}`, at: p.usedAt!, title: `${p.guestName} arrived`, body: `Their visitor pass was accepted at the gate.`, tone: "live" });
  }

  for (const v of state.vehicles.filter((x) => x.ownerCard === card && x.kind === "temporary")) {
    out.push({ id: `temp-${v.id}`, at: v.createdAt, title: "Temporary vehicle added", body: `${v.plate} is linked to your card until midnight.`, tone: "neutral" });
  }

  for (const w of (state.waitlist ?? []).filter((x) => x.ownerCard === card)) {
    if (free[w.vehicle] > 0) {
      out.push({
        id: `wait-${w.id}`,
        at: w.createdAt,
        title: "A bay is free",
        body: `${free[w.vehicle]} ${w.vehicle === "heavy" ? "heavy vehicle" : "light vehicle"} bay${free[w.vehicle] === 1 ? " is" : "s are"} open now.`,
        tone: "live",
      });
    }
  }

  const DAY = 24 * 60 * 60 * 1000;
  if (gate.expiresAt !== undefined) {
    const left = Math.ceil((gate.expiresAt - now) / DAY);
    if (left <= 0) {
      out.push({ id: "pass-expired", at: gate.expiresAt, title: "Your monthly pass has expired", body: "The card can't open the gate until the pass is renewed at the office.", tone: "crimson" });
    } else if (left <= PASS_WARN_DAYS) {
      out.push({ id: "pass-soon", at: gate.expiresAt - PASS_WARN_DAYS * DAY, title: `Your pass expires in ${left} day${left === 1 ? "" : "s"}`, body: "Renew it at the office to keep using the gate.", tone: "gold" });
    }
  }
  if (gate.parkedSince !== undefined && now - gate.parkedSince >= LONG_STAY_HOURS * 60 * 60 * 1000) {
    const hours = Math.floor((now - gate.parkedSince) / (60 * 60 * 1000));
    out.push({ id: "long-stay", at: gate.parkedSince + LONG_STAY_HOURS * 60 * 60 * 1000, title: `You've been parked ${hours} hours`, body: "Long stays can be flagged as an overstay. Move your car soon.", tone: "gold" });
  }
  if (gate.fullFloors?.length) {
    const list = gate.fullFloors.map((f) => `Level ${f}`).join(", ");
    // pinned to the hour, so it counts as new once an hour rather than on every refresh
    out.push({ id: "floors-full", at: Math.floor(now / (60 * 60 * 1000)) * 60 * 60 * 1000, title: gate.fullFloors.length === 1 ? `${list} is full` : `${list} are full`, body: "Try another level, or join the waitlist on My parking.", tone: "neutral" });
  }

  return out.sort((a, b) => b.at - a.at).slice(0, MAX_NOTICES);
}
