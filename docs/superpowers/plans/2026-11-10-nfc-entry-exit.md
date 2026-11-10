# NFC Registration and Entry/Exit Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register drivers by scanning an NFC card, and record vehicle entry/exit by scanning, with live slot count and pass-status feedback.

**Architecture:** A `useNfcReader` hook wraps Web NFC and only emits normalized serials. The existing in-memory store gains a pure `scan(nfcId)` action that decides entered/exited/rejected. A new `/admin/scan` page and a "Scan card" button in the user panel consume both.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, Web NFC (`NDEFReader`), Vitest (new, dev only, for store/hook logic), lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-10-nfc-entry-exit-design.md`

All paths below are relative to `caps-landing/`.

## Global Constraints

- Reader is Android Chrome Web NFC; needs HTTPS or localhost and a user gesture to start scanning.
- Prototype only: in-memory store, no backend, data resets on reload. No Supabase, no iOS, no card writing, no public signup form changes.
- Saved NFC ID is the scanned serial: uppercase hex, colon-separated (`04:A1:B2:C3`). Legacy digit IDs (`1234-5678-9012`) stay valid. Matching is case-insensitive.
- Rejection copy is exactly "Invalid monthly pass" or "Pass expired". Unregistered cards: "Unregistered card".
- Amber "expiring" indicator at 5 days or fewer remaining.
- Follow existing patterns: `useSparcStore`/`useSparcState`, `ActionResult`, `ui.tsx` toast/components, `side-link` nav.

## Review Focus

- Expired or suspended driver who is already parked taps to leave: must be allowed to exit (never trapped). Tested in Task 2.
- Card tapped twice quickly (Web NFC fires repeated reads): a second read of the same serial within 2 s is ignored, not treated as an exit. Tested in Task 3.
- Lot full for the user's vehicle class: entry rejected with "full", nothing logged as an entry. Tested in Task 2.
- Lowercase hex typed by hand into the NFC field: normalized so it matches the scanned form. Tested in Task 1.
- Renewing an expired user and then scanning: the next entry succeeds. Tested in Task 2.

---

### Task 1: Test runner and hex-aware NFC IDs

**Files:**
- Modify: `package.json` (add `vitest` devDependency, script `"test": "vitest run"`)
- Create: `vitest.config.ts` (alias `@` -> `./src`, environment `node`)
- Modify: `src/lib/sparc/store.ts` (`normalizeNfc`, `validateUser`)
- Test: `src/lib/sparc/store.test.ts`

**Interfaces:**
- Produces: `normalizeNfc(value: string): string` handling both formats; `validateUser` keeps its signature.

- [ ] **Step 1: Install vitest** with `npm i -D vitest -w caps-landing`; add the config and `test` script.
- [ ] **Step 2: Write failing tests** in `store.test.ts`:
  - `normalizeNfc("04:a1:b2:c3")` returns `"04:A1:B2:C3"`.
  - `normalizeNfc("1234-5678-9012")` is unchanged.
  - `validateUser` accepts `04:A1:B2:C3` and the 7-byte `04:A1:B2:C3:D4:E5:F6`; returns an `nfcId` error for `04:A1:ZZ:C3`, for colon-less `04A1B2C3`, and for `04-a1`.
  - The duplicate check is case-insensitive: an existing `04:A1:B2:C3` blocks `04:a1:b2:c3`.
- [ ] **Step 3: Run** `npm test -w caps-landing`; expect FAIL.
- [ ] **Step 4: Implement.** In `normalizeNfc`: trim; if the value contains `:`, uppercase it, keep only `[0-9A-F:]`, collapse repeated colons and trim edge colons; otherwise run the existing digit logic. In `validateUser`: valid if digits-and-dashes (existing rule) or `^[0-9A-F]{2}(:[0-9A-F]{2}){3,9}$`; error text mentions both formats.
- [ ] **Step 5: Run tests**; expect PASS. Run `npm run lint -w caps-landing`.
- [ ] **Step 6: Commit** `feat: accept hex NFC serials and add vitest`

### Task 2: `scan()` store action

**Files:**
- Modify: `src/lib/sparc/types.ts`, `src/lib/sparc/store.ts`
- Test: `src/lib/sparc/store.test.ts`

**Interfaces:**
- Consumes: `normalizeNfc`, `addOneMonth`, existing `slots`, `users`, `logs`.
- Produces in `types.ts`:
  - `ScanOutcome = { status: "entered" | "exited"; user: RegisteredUser; slot: string; floor: number } | { status: "expired" | "no-pass" | "full"; user: RegisteredUser } | { status: "unregistered"; nfcId: string }`
  - `ScanRecord = { id: string; at: number; nfcId: string; outcome: ScanOutcome }`
  - `SparcState.scans: ScanRecord[]` (newest first, capped at 50)
  - `SparcStore.scan(nfcId: string): ScanOutcome`
- Rules: `no-pass` means `user.active === false`; `expired` means `expiresAt <= now`. These checks apply to entry only. A user already in a slot (`slot.occupant.userId === user.id`) always exits, whatever their pass status. Entry takes the first `free` slot whose `vehicle` equals the user's class, sets it `occupied` with an `occupant`, and appends an `entry` LogEntry with a new `visitId`. Exit frees the slot and appends an `exit` LogEntry reusing the entry's `visitId`. Rejected scans go to `scans` only, never to `logs`, because `dayReport` treats any non-entry log as an exit. `nextLogSeq` increments per log.

- [ ] **Step 1: Write failing tests** (use `createSparcStore(fixedNow)`, `addUser` for setup, fake timers for `Date.now`):
  - valid pass and a free slot returns `entered`; the slot is occupied, one `entry` log exists, the free count drops by 1.
  - the same card again returns `exited`; the slot is free and the `exit` log shares the `visitId`.
  - an expired user returns `expired` with no slot change, no log, and one `scans` record.
  - `active: false` returns `no-pass`; an unknown serial returns `unregistered`; `04:a1:b2:c3` matches a stored `04:A1:B2:C3`.
  - fill every heavy slot with distinct users: the next heavy user gets `full`, and a light user still enters.
  - a user who is parked and then expires (advance time) still exits.
  - `renewUser` on an expired user, then `scan`, returns `entered`.
  - `scans` never exceeds 50 records.
- [ ] **Step 2: Run**; expect FAIL.
- [ ] **Step 3: Implement** per the rules above in `createSparcStore`; add `scans: []` to the initial state and expose `scan`.
- [ ] **Step 4: Run tests**; expect PASS.
- [ ] **Step 5: Commit** `feat: add scan action for entry/exit`

### Task 3: `useNfcReader` hook

**Files:**
- Create: `src/lib/nfc/serial.ts`, `src/lib/nfc/reader.ts`, `src/lib/nfc/useNfcReader.ts`
- Test: `src/lib/nfc/serial.test.ts`, `src/lib/nfc/reader.test.ts`

**Interfaces:**
- Produces:
  - `normalizeSerial(raw: string): string` returns uppercase colon-separated hex and accepts input with or without colons.
  - `createNfcReader(onScan: (serial: string) => void, ctor: typeof NDEFReader | undefined)` returns `{ start(): Promise<void>; stop(): void; getSnapshot(): ReaderSnapshot; subscribe(l: () => void): () => void }`.
  - `ReaderSnapshot = { status: "unsupported" | "idle" | "scanning" | "denied" | "error"; message: string | null }`.
  - `useNfcReader(onScan): ReaderSnapshot & { start(): Promise<void>; stop(): void }` is a thin `useSyncExternalStore` wrapper around `createNfcReader`.

- [ ] **Step 1: Write failing tests:**
  - `normalizeSerial("04a1b2c3")` and `("04:a1:b2:c3")` both return `"04:A1:B2:C3"`.
  - With a fake `NDEFReader` class: `start()` calls `scan()`, and a `reading` event with `serialNumber: "04:a1:b2:c3"` calls `onScan("04:A1:B2:C3")`.
  - The same serial twice within 2000 ms (fake timers) calls `onScan` once; after 2001 ms it is called again.
  - `scan()` rejecting with `NotAllowedError` gives status `denied`; any other error gives `error` with message "Could not start NFC. Turn NFC on and try again."; no constructor gives `unsupported` with message "NFC scanning needs Chrome on an Android phone."
  - `stop()` aborts the `AbortController` signal and returns status to `idle`.
- [ ] **Step 2: Run**; expect FAIL.
- [ ] **Step 3: Implement** with `new NDEFReader().scan({ signal })`, listening for `reading` (use `event.serialNumber`) and `readingerror`.
- [ ] **Step 4: Run tests**; expect PASS.
- [ ] **Step 5: Commit** `feat: add Web NFC reader hook`

### Task 4: Entry / Exit scanner page

**Files:**
- Create: `src/app/(console)/admin/scan/page.tsx` (metadata title "Entry / Exit · Admin", renders `<ScanView />`), `src/components/console/ScanView.tsx`, `src/components/console/ScanResultCard.tsx`
- Modify: `src/components/console/ConsoleShell.tsx` (`NAV`: add `{ href: "/admin/scan", label: "Entry / Exit", short: "Scan", icon: ScanLine }` right after Live status)
- Modify: `src/lib/sparc/selectors.ts` (add `passStatus`)
- Test: `src/lib/sparc/selectors.test.ts`

**Interfaces:**
- Consumes: `store.scan`, `useNfcReader`, `floorStats`, `buildingTotals`, `useNow`, `state.scans`.
- Produces: `passStatus(user: RegisteredUser, now: number): { state: "active" | "expiring" | "expired" | "suspended"; daysLeft: number }`. `daysLeft = max(0, ceil((expiresAt - now) / 86_400_000))`; `expiring` when `daysLeft <= 5`; `suspended` when `!active`; `expired` when `expiresAt <= now`.

- [ ] **Step 1: Write failing tests** for `passStatus`: 20 days gives active/20; 5 days gives expiring/5; 6 days gives active; past expiry gives expired/0; `active: false` gives suspended.
- [ ] **Step 2: Run**; expect FAIL. **Step 3: Implement** `passStatus`; run again, expect PASS.
- [ ] **Step 4: Build `ScanView`:** an "Enable NFC" button (calls `start()` from the click handler), a status/message line from the hook, live totals (`free / total` plus per-floor chips), the latest `ScanResultCard`, and the last 10 entries of `state.scans`. When the hook is `unsupported`, show its message plus a "Simulate scan" input and button that calls the same scan handler, so the page can be demoed on a PC.
- [ ] **Step 5: Build `ScanResultCard`** by outcome:
  - `entered` / `exited`: profile (name, role, plate, vehicle label), slot and floor, and a `passStatus` badge (green "Active · N days left", amber "Expiring in N days").
  - `expired`: red banner "Pass expired" with the expiry date.
  - `no-pass`: red banner "Invalid monthly pass".
  - `unregistered`: red banner "Unregistered card" with a link to `/admin/users?nfc=<id>` (existing prefill).
  - `full`: amber banner "No free slot for this vehicle class".
- [ ] **Step 6: Verify:** `npm run lint -w caps-landing` and `npm run build -w caps-landing` pass. Then `npm run dev`, open `/admin/scan`, use Simulate scan with `1234-5678-9012` (the seeded expired demo user) and expect "Pass expired". Register another user and simulate twice, expecting entered then exited with the free count changing.
- [ ] **Step 7: Commit** `feat: add entry/exit scanner page`

### Task 5: Scan card button in the user panel

**Files:**
- Modify: `src/components/console/UserPanel.tsx` (NFC field near line 138)

**Interfaces:**
- Consumes: `useNfcReader`, `normalizeNfc`. Produces: none.

- [ ] **Step 1:** Add a "Scan card" button beside the NFC input. Click calls `start()`; the label becomes "Tap a card…" while scanning. On the first `onScan(serial)`: `update("nfcId", serial)` then `stop()`. Unsupported/denied/error messages show in the field hint. Update the hint to "Scan a card, or type digits like 1234-5678-9012 or hex like 04:A1:B2:C3."
- [ ] **Step 2: Verify:** lint and build pass; in dev on desktop Chrome the button renders and shows the unsupported message.
- [ ] **Step 3: Commit** `feat: register users by scanning an NFC card`

### Task 6: Device check (manual, run by the user)

- [ ] Serve over a secure context: USB-debug the phone and run `adb reverse tcp:3000 tcp:3000`, then open `http://localhost:3000` in phone Chrome (or deploy to Vercel).
- [ ] Register a card via Users, Add, Scan card. Open Entry / Exit and tap the same card: expect entered, then exited on a second tap more than 2 s later. Tap an unregistered card: expect "Unregistered card".
- [ ] Report any card whose serial reads differently than expected.
