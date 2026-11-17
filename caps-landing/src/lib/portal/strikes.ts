import type { Violation } from "./types";

/**
 * Placeholder policy until the team confirms real values: a confirmed violation is a strike, and
 * 3 strikes suspend the card. The suspension stays until an admin clears it, which restarts the count.
 */
export const STRIKE_LIMIT = 3;

export type Standing = {
  strikes: number;
  limit: number;
  suspended: boolean;
};

/** `reinstatedAt` is when an admin last cleared this card's suspension: older strikes no longer count. */
export function standingFor(violations: Violation[], card: string, reinstatedAt = 0): Standing {
  const strikes = violations.filter((v) => v.ownerCard === card && v.status === "confirmed" && (v.reviewedAt ?? v.at) > reinstatedAt).length;
  return { strikes, limit: STRIKE_LIMIT, suspended: strikes >= STRIKE_LIMIT };
}
