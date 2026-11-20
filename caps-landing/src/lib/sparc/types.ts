/** Domain types for the SPARC admin console. Mirrors the proposal's data stores D1–D3. */

export type SlotStatus = "free" | "occupied";

export type Occupant = {
  userId: string;
  name: string;
  nfcId: string;
  /** ms epoch the driver entered */
  since: number;
};

/** D3 Parking Slots */
export type Slot = {
  code: string; // A1, B7 …
  floor: number; // 1-based
  index: number; // 1-based position on the floor
  status: SlotStatus;
  occupant?: Occupant;
};

export type FloorConfig = {
  floor: number;
  slots: number;
};

/** Parking is registered to these three roles only; admins manage the data but never park under this role. */
export type UserRole = "student" | "personnel" | "visitor";

/** D1 Registered Users */
export type RegisteredUser = {
  id: string;
  /** "1234-5678-9012". The member enters it when signing up. Empty only on records made before cards were collected. */
  nfcId: string;
  /** School-issued ID (student number or employee ID), given by the member at sign-up. Separate from the card. */
  studentId?: string;
  /** The university email the member signed up with. */
  email?: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: number;
  /** Monthly pass expiry: one calendar month after activation or last renewal. 0 means Pending: no pass has been activated yet. */
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
  /** Which gate the tap came through. Absent on records made before gates were recorded. */
  gate?: string;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export type UserInput = {
  name: string;
  studentId: string;
  /** Empty creates a Pending member; otherwise the card for an active pass. */
  nfcId: string;
  role: UserRole;
  active: boolean;
  email?: string;
};

/** Which gate the admin is scanning for. */
export type ScanMode = "entry" | "exit";

/** Result of tapping a card at the entry/exit scanner. */
export type ScanOutcome =
  | { status: "entered"; user: RegisteredUser; slot: string; floor: number; walkIn?: boolean }
  | { status: "exited"; user: RegisteredUser; slot: string; floor: number; walkIn?: boolean }
  | { status: "already-inside"; user: RegisteredUser; slot: string; floor: number; walkIn?: boolean }
  | { status: "not-inside"; user: RegisteredUser }
  | { status: "expired" | "no-pass"; user: RegisteredUser }
  | { status: "full"; user: RegisteredUser; walkIn?: boolean }
  /** A valid pass at the entry scanner: the facilitator now chooses which floor the car goes to. Nothing is booked yet. */
  | { status: "needs-floor"; user: RegisteredUser; walkIn?: boolean }
  | { status: "unregistered"; nfcId: string };

/** One row in the scanner's recent-scans list. Rejected scans live here, not in the audit log. */
export type ScanRecord = { id: string; at: number; nfcId: string; outcome: ScanOutcome };
