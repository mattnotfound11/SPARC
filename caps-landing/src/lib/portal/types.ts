/** Driver portal types. Vehicles are separate records from the person (plan: "register vehicles separately from the person"). */

import type { VehicleClass } from "@/lib/sparc/types";

export const MAX_VEHICLES = 3;

export type VehicleKind = "owned" | "temporary";

export type Vehicle = {
  id: string;
  /** Owner's card key (cardKey of the registered NFC ID). */
  ownerCard: string;
  plate: string;
  type: VehicleClass;
  kind: VehicleKind;
  /** Temporary vehicles only: the day (ms epoch, end of day) the pass is valid until. */
  validUntil?: number;
  createdAt: number;
};

export type ViolationType = "overstay" | "overnight" | "anti-passback";
/** open: flagged, awaiting review. appealed: the driver disputes it. confirmed: an admin upheld it, the strike stands. dismissed: an admin cancelled it, no strike. */
export type ViolationStatus = "open" | "appealed" | "confirmed" | "dismissed";

export type Violation = {
  id: string;
  ownerCard: string;
  type: ViolationType;
  at: number;
  /** Plate of the car the violation points to, when known. */
  plate?: string;
  status: ViolationStatus;
  /** When an admin decided it. */
  reviewedAt?: number;
};

export type Appeal = {
  id: string;
  violationId: string;
  note: string;
  createdAt: number;
};

/** A one-day QR pass a host (faculty or office) registers for a guest without a campus card. */
export type VisitorPass = {
  id: string;
  /** What the QR code holds, and what the marshal can also type in. */
  code: string;
  hostCard: string;
  guestName: string;
  plate: string;
  /** Start of the day the pass is valid (ms epoch). It expires at the end of that day. */
  date: number;
  purpose: string;
  createdAt: number;
  /** Set when the gate accepts the pass; a pass works once. */
  usedAt?: number;
  /** Made-up pass from the demo data, so the marshal scanner can list it. */
  sample?: boolean;
};

export type PortalState = {
  vehicles: Vehicle[];
  /** The vehicle the driver is using today, per owner card. */
  activeVehicle: Record<string, string>;
  violations: Violation[];
  appeals: Appeal[];
  passes: VisitorPass[];
  /** Set when the demo account was loaded, so the forecast and analytics default to sample history. */
  demo?: boolean;
};
