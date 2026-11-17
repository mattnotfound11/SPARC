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
export function noticesFor(state: PortalState, card: string, free: Record<VehicleClass, number>, now = Date.now()): Notice[] {
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

  const standing = standingFor(state.violations, card, now);
  const lastStrike = Math.max(0, ...mine.filter((v) => v.status === "confirmed").map((v) => v.reviewedAt ?? v.at));
  if (standing.suspended) {
    out.push({ id: "suspended", at: lastStrike, title: "Card suspended", body: `You have ${standing.strikes} strikes, so the card can't open the gate until the oldest one expires.`, tone: "crimson" });
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

  return out.sort((a, b) => b.at - a.at).slice(0, MAX_NOTICES);
}
