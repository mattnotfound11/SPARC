import type { ViolationStatus, ViolationType } from "./types";

/** Wording for violations, shared by the driver's page and the admin queue so they always agree. */
export const TYPE_LABEL: Record<ViolationType, { title: string; detail: string }> = {
  overstay: { title: "Overstay", detail: "Parked longer than the allowed hours." },
  overnight: { title: "Overnight parking", detail: "The car stayed inside overnight." },
  "anti-passback": { title: "Second entry without exit", detail: "The card tapped in twice without tapping out." },
  temporary: { title: "Temporary vehicle entry", detail: "Entered in a borrowed or rental car, which an admin checks." },
};

export const STATUS_LABEL: Record<ViolationStatus, { label: string; tone: "crimson" | "gold" | "live" | "neutral" }> = {
  open: { label: "Under review", tone: "gold" },
  appealed: { label: "Appeal sent", tone: "gold" },
  confirmed: { label: "Confirmed", tone: "crimson" },
  dismissed: { label: "Dismissed", tone: "neutral" },
};
