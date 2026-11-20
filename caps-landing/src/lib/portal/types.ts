/** Driver portal types. Vehicles are separate records from the person (plan: "register vehicles separately from the person"). */

export const MAX_VEHICLES = 3;

export type VehicleKind = "owned" | "temporary";

export type Vehicle = {
  id: string;
  /** Owner's card key (cardKey of the registered NFC ID). */
  ownerCard: string;
  plate: string;
  kind: VehicleKind;
  /** Temporary vehicles only: the day (ms epoch, end of day) the pass is valid until. */
  validUntil?: number;
  createdAt: number;
};

export type ViolationType = "overstay" | "overnight" | "anti-passback" | "temporary";
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
  /** Where the host will email the pass. Optional. */
  guestEmail?: string;
  /** Made-up pass from the demo data, so the marshal scanner can list it. */
  sample?: boolean;
};

/** A driver asking to be told when a bay is free. */
export type WaitEntry = { id: string; ownerCard: string; createdAt: number };

/** A special day (graduation, a game) the marshal flags, so drivers and the lobby screen are warned. */
export type EventMode = {
  name: string;
  /** Start of the event day (ms epoch). Holds apply on that day only. */
  date: number;
  /** Bays held back on every open floor for the event. */
  reservedPerFloor: number;
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
  waitlist?: WaitEntry[];
  /** Set while event mode is on. */
  event?: EventMode | null;
  /** When an admin last cleared a card's suspension, per card. Strikes before it no longer count. */
  reinstated?: Record<string, number>;
};
