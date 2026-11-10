/** Domain types for the SPARC admin console. Mirrors the proposal's data stores D1–D3. */

/** "heavy" = SUVs and vans (floors 1–2 by default), "light" = lighter vehicles (floors 3–5). */
export type VehicleClass = "heavy" | "light";

export type SlotStatus = "free" | "reserved" | "occupied";

export type Occupant = {
  userId: string;
  name: string;
  plate: string;
  nfcId: string;
  /** ms epoch the slot was reserved / the driver entered */
  since: number;
};

/** D3 Parking Slots */
export type Slot = {
  code: string; // A1, B7 …
  floor: number; // 1-based
  index: number; // 1-based position on the floor
  vehicle: VehicleClass;
  status: SlotStatus;
  occupant?: Occupant;
};

export type FloorConfig = {
  floor: number;
  vehicle: VehicleClass;
  slots: number;
};

/** Parking is registered to these three roles only; admins manage the data but never park under this role. */
export type UserRole = "student" | "personnel" | "visitor";

/** D1 Registered Users */
export type RegisteredUser = {
  id: string;
  nfcId: string; // "1234-5678-9012"
  name: string;
  role: UserRole;
  vehicle: VehicleClass;
  plate: string;
  active: boolean;
  createdAt: number;
  /** Monthly pass expiry: one calendar month after registration or last renewal. */
  expiresAt: number;
};

export type LogEvent = "entry" | "exit";

/** D2 Parking Logs */
export type LogEntry = {
  id: string;
  /** Pairs an entry with its exit. */
  visitId: string | null;
  at: number;
  event: LogEvent;
  nfcId: string;
  userId: string | null;
  userName: string | null;
  slot: string | null;
  floor: number | null;
  vehicle: VehicleClass | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export type UserInput = {
  name: string;
  nfcId: string;
  role: UserRole;
  vehicle: VehicleClass;
  plate: string;
  active: boolean;
};

/** Result of tapping a card at the entry/exit scanner. */
export type ScanOutcome =
  | { status: "entered" | "exited"; user: RegisteredUser; slot: string; floor: number }
  | { status: "expired" | "no-pass" | "full"; user: RegisteredUser }
  | { status: "unregistered"; nfcId: string };

/** One row in the scanner's recent-scans list. Rejected scans live here, not in the audit log. */
export type ScanRecord = { id: string; at: number; nfcId: string; outcome: ScanOutcome };
