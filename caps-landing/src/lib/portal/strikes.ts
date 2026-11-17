import type { Violation } from "./types";

/**
 * Placeholder policy until the team confirms real values:
 * a confirmed violation is a strike for 90 days, and 3 live strikes suspend the card.
 */
export const STRIKE_LIMIT = 3;
export const STRIKE_WINDOW_DAYS = 90;

const DAY = 24 * 60 * 60 * 1000;

export type Standing = {
  strikes: number;
  limit: number;
  suspended: boolean;
  /** When the oldest live strike expires, which is when a suspension can start to lift. */
  nextExpiry?: number;
};

export function standingFor(violations: Violation[], card: string, now = Date.now()): Standing {
  const live = violations
    .filter((v) => v.ownerCard === card && v.status === "confirmed" && now - (v.reviewedAt ?? v.at) < STRIKE_WINDOW_DAYS * DAY)
    .map((v) => (v.reviewedAt ?? v.at) + STRIKE_WINDOW_DAYS * DAY)
    .sort((a, b) => a - b);
  return { strikes: live.length, limit: STRIKE_LIMIT, suspended: live.length >= STRIKE_LIMIT, nextExpiry: live[0] };
}
