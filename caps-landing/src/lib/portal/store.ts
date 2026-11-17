import { MAX_VEHICLES, type Appeal, type EventMode, type PortalState, type Vehicle, type VisitorPass, type Violation, type WaitEntry } from "./types";
import type { ActionResult, VehicleClass } from "@/lib/sparc/types";

/*
 * Driver portal data layer. Browser-local for now (no backend connected). Everything the portal
 * reads or writes goes through this module, so switching to Supabase means replacing this file.
 */

const KEY = "sparc_portal_v1";

export const PLATE_PATTERN = /^[A-Z]{2,4} ?[0-9]{3,4}$|^[A-Z0-9]{2,3}[ -]?[A-Z0-9]{3,4}$/;

export function normalizePlate(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function endOfToday(now: number) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function load(): PortalState {
  const empty: PortalState = { vehicles: [], activeVehicle: {}, violations: [], appeals: [], passes: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as PortalState) } : empty;
  } catch {
    return empty;
  }
}

function save(state: PortalState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: the page still works for this visit */
  }
}

/** The demo driver. Its number is also the placeholder in the sign-in box. */
export const DEMO_CARD = "123456789012";
export const DEMO_CARD_LABEL = "1234-5678-9012";
/** A pass for today, so the marshal scanner has something that works. */
export const DEMO_PASS_CODE = "SPARC-V-DEMOGUEST";

export type PassInput = { guestName: string; plate: string; date: number; purpose: string };
export type PassResult = { ok: true; pass: VisitorPass } | { ok: false; error: string };
export type RedeemOutcome =
  | { status: "ok"; pass: VisitorPass }
  | { status: "unknown" | "used" | "expired" | "early"; pass?: VisitorPass };

/** Passes are booked up to this far ahead. */
export const PASS_HORIZON_DAYS = 30;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, so a typed code is hard to misread

export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type PortalStore = {
  get: () => PortalState;
  subscribe: (fn: () => void) => () => void;
  addVehicle: (ownerCard: string, input: { plate: string; type: VehicleClass }) => ActionResult;
  addTemporary: (ownerCard: string, input: { plate: string; type: VehicleClass }, now?: number) => ActionResult;
  removeVehicle: (ownerCard: string, id: string) => ActionResult;
  setActive: (ownerCard: string, id: string) => ActionResult;
  appeal: (violationId: string, note: string, now?: number) => ActionResult;
  /** An admin decides a flagged or appealed violation: "confirm" keeps the strike, "dismiss" cancels it. */
  reviewViolation: (violationId: string, decision: "confirm" | "dismiss", now?: number) => ActionResult;
  createPass: (hostCard: string, input: PassInput, now?: number) => PassResult;
  /** The gate accepts a pass once, on its day. */
  redeemPass: (code: string, now?: number) => RedeemOutcome;
  /** Demo only: adds sample violations for a card until the backend produces real ones. */
  seedSample: (ownerCard: string, now?: number) => void;
  /** Demo only: fills the demo account with vehicles, violations, an appeal and visitor passes. Safe to call twice. */
  /** The driver asks to be told when a bay of this class is free. One request per card. */
  joinWaitlist: (ownerCard: string, vehicle: VehicleClass, now?: number) => ActionResult;
  leaveWaitlist: (ownerCard: string) => void;
  /** The marshal turns event mode on (until the end of today) or off with null. */
  setEvent: (name: string | null, now?: number) => ActionResult;
  seedDemo: (now?: number) => void;
  /** Demo only: gives the admin sample drivers a vehicle each, violations, appeals, strikes and a few visitor passes. Safe to call twice. */
  seedDrivers: (drivers: { card: string; type: VehicleClass }[], now?: number) => void;
};

export function createPortalStore(storage: () => PortalState = load, write: (s: PortalState) => void = save): PortalStore {
  let state = storage();
  const listeners = new Set<() => void>();
  const set = (next: PortalState) => {
    state = next;
    write(next);
    listeners.forEach((l) => l());
  };
  const idFor = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

  function validatePlate(plate: string): string | null {
    const p = normalizePlate(plate);
    if (!PLATE_PATTERN.test(p)) return "Enter a plate such as ABC 1234.";
    return null;
  }

  return {
    get: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    addVehicle(ownerCard, { plate, type }) {
      const owned = state.vehicles.filter((v) => v.ownerCard === ownerCard && v.kind === "owned");
      if (owned.length >= MAX_VEHICLES) return { ok: false, error: `You can register up to ${MAX_VEHICLES} vehicles.` };
      const bad = validatePlate(plate);
      if (bad) return { ok: false, error: bad };
      const p = normalizePlate(plate);
      if (state.vehicles.some((v) => v.plate === p && v.kind === "owned")) return { ok: false, error: "That plate is already registered." };
      const vehicle: Vehicle = { id: idFor("veh"), ownerCard, plate: p, type, kind: "owned", createdAt: Date.now() };
      const activeVehicle = { ...state.activeVehicle };
      if (!activeVehicle[ownerCard]) activeVehicle[ownerCard] = vehicle.id;
      set({ ...state, vehicles: [...state.vehicles, vehicle], activeVehicle });
      return { ok: true };
    },
    addTemporary(ownerCard, { plate, type }, now = Date.now()) {
      const bad = validatePlate(plate);
      if (bad) return { ok: false, error: bad };
      const vehicle: Vehicle = {
        id: idFor("tmp"),
        ownerCard,
        plate: normalizePlate(plate),
        type,
        kind: "temporary",
        validUntil: endOfToday(now),
        createdAt: now,
      };
      set({ ...state, vehicles: [...state.vehicles, vehicle], activeVehicle: { ...state.activeVehicle, [ownerCard]: vehicle.id } });
      return { ok: true };
    },
    removeVehicle(ownerCard, id) {
      const target = state.vehicles.find((v) => v.id === id && v.ownerCard === ownerCard);
      if (!target) return { ok: false, error: "Vehicle not found." };
      const vehicles = state.vehicles.filter((v) => v.id !== id);
      const activeVehicle = { ...state.activeVehicle };
      if (activeVehicle[ownerCard] === id) {
        const next = vehicles.find((v) => v.ownerCard === ownerCard && v.kind === "owned");
        if (next) activeVehicle[ownerCard] = next.id;
        else delete activeVehicle[ownerCard];
      }
      set({ ...state, vehicles, activeVehicle });
      return { ok: true };
    },
    setActive(ownerCard, id) {
      const target = state.vehicles.find((v) => v.id === id && v.ownerCard === ownerCard);
      if (!target) return { ok: false, error: "Vehicle not found." };
      if (target.kind === "temporary" && target.validUntil! < Date.now()) return { ok: false, error: "That temporary pass has expired." };
      set({ ...state, activeVehicle: { ...state.activeVehicle, [ownerCard]: id } });
      return { ok: true };
    },
    appeal(violationId, note, now = Date.now()) {
      const v = state.violations.find((x) => x.id === violationId);
      if (!v) return { ok: false, error: "Violation not found." };
      if (v.status !== "open") return { ok: false, error: "This violation already has an appeal." };
      if (note.trim().length < 10) return { ok: false, error: "Give a short reason, at least 10 characters." };
      const appeal: Appeal = { id: idFor("apl"), violationId, note: note.trim(), createdAt: now };
      const violations: Violation[] = state.violations.map((x) => (x.id === violationId ? { ...x, status: "appealed" as const } : x));
      set({ ...state, violations, appeals: [...state.appeals, appeal] });
      return { ok: true };
    },
    reviewViolation(violationId, decision, now = Date.now()) {
      const v = state.violations.find((x) => x.id === violationId);
      if (!v) return { ok: false, error: "Violation not found." };
      if (v.status !== "open" && v.status !== "appealed") return { ok: false, error: "This violation has already been decided." };
      const status = decision === "confirm" ? ("confirmed" as const) : ("dismissed" as const);
      set({ ...state, violations: state.violations.map((x) => (x.id === violationId ? { ...x, status, reviewedAt: now } : x)) });
      return { ok: true };
    },
    createPass(hostCard, input, now = Date.now()) {
      const guestName = input.guestName.trim();
      const purpose = input.purpose.trim();
      if (guestName.length < 2) return { ok: false, error: "Enter the guest's full name." };
      const plateError = validatePlate(input.plate);
      if (plateError) return { ok: false, error: plateError };
      if (purpose.length < 3) return { ok: false, error: "Say briefly why they are visiting." };
      const today = startOfDay(now);
      const date = startOfDay(input.date);
      if (date < today) return { ok: false, error: "That date has already passed." };
      if (date > today + PASS_HORIZON_DAYS * 24 * 60 * 60 * 1000) return { ok: false, error: `Passes can be booked up to ${PASS_HORIZON_DAYS} days ahead.` };
      let code = "";
      do {
        code = "SPARC-V-" + Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
      } while (state.passes.some((p) => p.code === code));
      const pass: VisitorPass = { id: idFor("pass"), code, hostCard, guestName, plate: normalizePlate(input.plate), date, purpose, createdAt: now };
      set({ ...state, passes: [...state.passes, pass] });
      return { ok: true, pass };
    },
    redeemPass(code, now = Date.now()) {
      const wanted = normalizeCode(code);
      const pass = state.passes.find((p) => normalizeCode(p.code) === wanted);
      if (!pass) return { status: "unknown" };
      if (pass.usedAt !== undefined) return { status: "used", pass };
      const today = startOfDay(now);
      if (pass.date < today) return { status: "expired", pass };
      if (pass.date > today) return { status: "early", pass };
      const used: VisitorPass = { ...pass, usedAt: now };
      set({ ...state, passes: state.passes.map((p) => (p.id === pass.id ? used : p)) });
      return { status: "ok", pass: used };
    },
    seedDrivers(drivers, now = Date.now()) {
      drivers = drivers.filter((d) => d.card !== DEMO_CARD); // the demo driver has its own data
      const cards = drivers.map((d) => d.card);
      if (cards.length === 0) return;
      const hasViolations = state.violations.some((v) => cards.includes(v.ownerCard));
      const day = 24 * 60 * 60 * 1000;
      const hour = 60 * 60 * 1000;
      type Row = [card: number, type: Violation["type"], daysAgo: number, status: Violation["status"], note?: string, decidedDaysAgo?: number];
      const rows: Row[] = [
        // card 0 is suspended: three live strikes
        [0, "overstay", 62, "confirmed", undefined, 61],
        [0, "overnight", 31, "confirmed", "I left the car for a night class and the exit gate was closed.", 29],
        [0, "anti-passback", 6, "confirmed", undefined, 5],
        // card 1 is one strike away
        [1, "overstay", 40, "confirmed", undefined, 39],
        [1, "overnight", 12, "confirmed", undefined, 11],
        // appeals waiting for an admin
        [2, "overstay", 2, "appealed", "The lab session ran two hours over because of a power outage. My professor can confirm."],
        [3, "anti-passback", 1, "appealed", "The reader did not beep when I left, so I tapped again and it counted twice."],
        [4, "overnight", 1, "appealed", "My car would not start and I had to wait for a tow truck until morning."],
        // flags nobody has reviewed yet
        [5, "overstay", 3, "open"],
        [6, "anti-passback", 2, "open"],
        [7, "overnight", 1, "open"],
        [8, "overstay", 0, "open"],
        // decided
        [9, "overstay", 15, "dismissed", "The gate log shows I exited at 4:10 PM, within the allowed hours.", 13],
        [10, "anti-passback", 9, "dismissed", undefined, 8],
        [11, "overnight", 25, "confirmed", "I forgot the car was inside.", 23],
        [12, "overstay", 52, "confirmed", undefined, 50],
        [13, "overstay", 70, "dismissed", undefined, 68],
      ];
      const violations: Violation[] = [];
      const appeals: Appeal[] = [];
      rows.forEach(([c, type, daysAgo, status, note, decidedDaysAgo], i) => {
        const ownerCard = cards[c % cards.length];
        const at = now - daysAgo * day - (i % 5) * hour;
        const v: Violation = {
          id: idFor("vio"),
          ownerCard,
          type,
          at,
          plate: `SMP ${1000 + c * 37}`,
          status,
          ...(decidedDaysAgo !== undefined ? { reviewedAt: now - decidedDaysAgo * day } : {}),
        };
        violations.push(v);
        if (note) appeals.push({ id: idFor("apl"), violationId: v.id, note, createdAt: at + 3 * hour });
      });
      const vehicles: Vehicle[] = drivers.map((d, i) => ({
        id: idFor("veh"),
        ownerCard: d.card,
        plate: `SMP ${1000 + i * 37}`, // the plate the violations above carry
        type: d.type,
        kind: "owned" as const,
        createdAt: now - 45 * day,
      }));
      const newVehicles = vehicles.filter((v) => !state.vehicles.some((x) => x.ownerCard === v.ownerCard));
      const activeVehicle = { ...state.activeVehicle, ...Object.fromEntries(newVehicles.map((v) => [v.ownerCard, v.id])) };
      // One pass for every answer the marshal scanner can give
      const today = startOfDay(now);
      const pass = (n: number, code: string, guestName: string, plate: string, offset: number, purpose: string, used = false): VisitorPass => ({
        id: idFor("pass"),
        code,
        hostCard: cards[n % cards.length],
        guestName,
        plate,
        date: today + offset * day,
        purpose,
        createdAt: now - 2 * day,
        sample: true,
        ...(used ? { usedAt: now - 3 * hour } : {}),
      });
      const passes = [
        pass(15, "SPARC-V-VALID001", "Dr. Lucia Mendoza", "VST 2201", 0, "Faculty seminar"),
        pass(16, "SPARC-V-USED0001", "Mark Anthony Go", "VST 3345", 0, "Thesis defense", true),
        pass(17, "SPARC-V-OLD00001", "Carmela Ortiz", "VST 4410", -1, "Document pickup"),
        pass(18, "SPARC-V-SOON0001", "Engr. Paulo Reyes", "VST 5521", 2, "Equipment delivery"),
      ];
      const newPasses = passes.filter((p) => !state.passes.some((x) => x.code === p.code));
      if (hasViolations && newVehicles.length === 0 && newPasses.length === 0) return;
      set({
        ...state,
        vehicles: [...state.vehicles, ...newVehicles],
        activeVehicle,
        violations: hasViolations ? state.violations : [...state.violations, ...violations],
        appeals: hasViolations ? state.appeals : [...state.appeals, ...appeals],
        passes: [...state.passes, ...newPasses],
      });
    },
    joinWaitlist(ownerCard, vehicle, now = Date.now()) {
      const list = state.waitlist ?? [];
      if (list.some((w) => w.ownerCard === ownerCard)) return { ok: false, error: "You are already on the waitlist." };
      const entry: WaitEntry = { id: idFor("wait"), ownerCard, vehicle, createdAt: now };
      set({ ...state, waitlist: [...list, entry] });
      return { ok: true };
    },
    leaveWaitlist(ownerCard) {
      set({ ...state, waitlist: (state.waitlist ?? []).filter((w) => w.ownerCard !== ownerCard) });
    },
    setEvent(name, now = Date.now()) {
      if (name === null) {
        set({ ...state, event: null });
        return { ok: true };
      }
      const trimmed = name.trim();
      if (trimmed.length < 3) return { ok: false, error: "Name the event, for example Graduation." };
      const event: EventMode = { name: trimmed, startedAt: now, until: endOfToday(now) };
      set({ ...state, event });
      return { ok: true };
    },
    seedDemo(now = Date.now()) {
      const ownerCard = DEMO_CARD;
      const day = 24 * 60 * 60 * 1000;
      const car: Vehicle = { id: idFor("veh"), ownerCard, plate: "DEM 1234", type: "light", kind: "owned", createdAt: now - 60 * day };
      const truck: Vehicle = { id: idFor("veh"), ownerCard, plate: "TRK 5678", type: "heavy", kind: "owned", createdAt: now - 30 * day };
      const plate = car.plate;
      const appealed: Violation = { id: idFor("vio"), ownerCard, type: "overnight", at: now - 1 * day, plate, status: "appealed" };
      const violations: Violation[] = [
        { id: idFor("vio"), ownerCard, type: "overstay", at: now - 2 * day, plate, status: "open" },
        appealed,
        { id: idFor("vio"), ownerCard, type: "anti-passback", at: now - 5 * day, plate, status: "dismissed", reviewedAt: now - 4 * day },
        { id: idFor("vio"), ownerCard, type: "overnight", at: now - 20 * day, plate, status: "confirmed", reviewedAt: now - 19 * day },
        { id: idFor("vio"), ownerCard, type: "overstay", at: now - 41 * day, plate, status: "confirmed", reviewedAt: now - 40 * day },
      ];
      const appeal: Appeal = { id: idFor("apl"), violationId: appealed.id, note: "My class ran late because of the typhoon advisory, and the exit road was flooded.", createdAt: now - 12 * 60 * 60 * 1000 };
      const today = startOfDay(now);
      const passes: VisitorPass[] = [
        { id: idFor("pass"), code: DEMO_PASS_CODE, hostCard: ownerCard, guestName: "Maria Santos", plate: "NBX 4821", date: today, purpose: "Thesis consultation", createdAt: now - day, sample: true },
        { id: idFor("pass"), code: "SPARC-V-DEMOLATER", hostCard: ownerCard, guestName: "Engr. Ramon Cruz", plate: "KLM 9033", date: today + 3 * day, purpose: "Guest lecture", createdAt: now - 2 * 60 * 60 * 1000, sample: true },
      ];
      // Each part is added only if missing, so a card that already has some data still gets the rest
      const hasVehicles = state.vehicles.some((v) => v.ownerCard === ownerCard);
      const hasViolations = state.violations.some((v) => v.ownerCard === ownerCard);
      const newPasses = passes.filter((p) => !state.passes.some((x) => x.code === p.code));
      if (state.demo && hasVehicles && hasViolations && newPasses.length === 0) return;
      set({
        ...state,
        demo: true,
        vehicles: hasVehicles ? state.vehicles : [...state.vehicles, car, truck],
        activeVehicle: hasVehicles ? state.activeVehicle : { ...state.activeVehicle, [ownerCard]: car.id },
        violations: hasViolations ? state.violations : [...state.violations, ...violations],
        appeals: hasViolations ? state.appeals : [...state.appeals, appeal],
        passes: [...state.passes, ...newPasses],
      });
    },
    seedSample(ownerCard, now = Date.now()) {
      if (state.violations.some((v) => v.ownerCard === ownerCard)) return;
      const plate = state.vehicles.find((v) => v.ownerCard === ownerCard)?.plate;
      const day = 24 * 60 * 60 * 1000;
      const sample: Violation[] = [
        { id: idFor("vio"), ownerCard, type: "overstay", at: now - 2 * day, plate, status: "open" },
        { id: idFor("vio"), ownerCard, type: "anti-passback", at: now - 5 * day, plate, status: "dismissed", reviewedAt: now - 4 * day },
        { id: idFor("vio"), ownerCard, type: "overnight", at: now - 20 * day, plate, status: "confirmed", reviewedAt: now - 19 * day },
        { id: idFor("vio"), ownerCard, type: "overstay", at: now - 41 * day, plate, status: "confirmed", reviewedAt: now - 40 * day },
      ];
      set({ ...state, violations: [...state.violations, ...sample] });
    },
  };
}

/** The shared portal store. Components read it through useSyncExternalStore. */
export const portal = createPortalStore();
