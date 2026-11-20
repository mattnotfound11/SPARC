# Self-registration, Pending Pass and Floor Choice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Members register themselves; the admin Users page becomes a roster (no Register button) where new members wait as Pending until a pass is activated; vehicle size disappears; the facilitator chooses the floor at entry.

**Architecture:** A database trigger creates the `users` record and the `members` link when a sign-up's email is confirmed (pending: no card, `expires_at = 0`). The store drops vehicle class, treats `expiresAt === 0` as Pending, and splits entry into card check then floor choice (`scan(..., floor?)` returns `needs-floor` first). Console views lose vehicle badges and the add flow; the roster gains status tabs and an Activate pass action.

**Tech Stack:** Next.js (static export), React, Three.js scenes, Supabase (Auth, Postgres, RLS), Vitest.

**Spec (approved in conversation, 2026-11-20):** see the design messages. Pending pass until the parking office activates; no admin "Register user"; one account per email (plus-aliases rejected) and per student ID; vehicle size removed everywhere (one pool of 110 bays, five plain floors); entry flow: tap card, then pick a floor (floor only, first free bay on it).

## Global Constraints
- Pending means `expiresAt === 0` and no card. Activation sets the card, `active = true`, and `expiresAt = one month from now`.
- Matching and creation only for emails ending `@usa.edu.ph` without `+` in the local part; role is `student` or `personnel`.
- Database columns for vehicle (`users.vehicle`, `slots.vehicle`, `logs.vehicle`) are left alone and ignored: writes use the constant `light` (or null for logs). No destructive migration.
- Sign-up never reveals whether an ID or name is registered.

## Review Focus
- Second sign-up with the same student ID or the same email: no second record; the student sees a clear message at sign-in (Task 1, Task 5).
- Facilitator picks a floor that filled up a moment ago: "full" outcome, no crash, no double booking (Task 2).
- Pending member whose card isn't set yet is scanned: unregistered, not a crash (Task 2).
- Roster with zero members, only pending members, and many members (Task 4).

### Task 1: Database
**Files:** Modify `supabase/schema.sql`, `supabase/lock-down.sql`; apply migrations.
- `users.email text` (unique on lower), `users.nfc_id` nullable (card_key unique allows many nulls).
- Replace `claim_member_pass()` to create the record + link on email confirmation (rules above; duplicate ID or email: no record, no error).
- Drop `claim_pass_for_user` (never applied) and `link_member` (no UI).
- Lock-down: members still read only their own `users` row and logs.

### Task 2: Store and logic (TDD)
**Files:** `lib/sparc/types.ts`, `seed.ts`, `selectors.ts`, `store.ts`, `sample.ts`, tests.
- Remove `VehicleClass` and every `vehicle` field/param; `RegisteredUser.email?`; `ScanOutcome` gains `{ status: "needs-floor"; user }`.
- `pickFreeSlot(config, slots, floor, now)`; `passStatus` returns `"pending"` for `expiresAt === 0`.
- `scan(nfcId, mode, gate?, floor?)`: entry without a floor, after pass checks, returns `needs-floor` and writes nothing; with a floor books the first free bay there or returns `full`.
- `activateUser(id, nfcId)`; sample data gets a few pending members.

### Task 3: Sync
**Files:** `lib/supabase/sync.ts`, test.
- Map `email`, nullable card; write constant `light` for the legacy columns.

### Task 4: Console UI
**Files:** `UsersView`, `UserPanel` (edit/activate only), `ScanView` (floor picker), `ScanResultCard`, `FloorList`, `ParkingExplorer`, `ParkingTowers`, `SlotMap`, `parkingScene`, `towerScene`, `LogsView`, `TemporaryVehiclePanel`, `PassScanView`, `ui.tsx`.
- Roster tabs (All, Pending, Active, Expiring, Expired, Suspended) with counts and search; no Register button; Activate pass for pending.
- Delete `MemberLoginLink` and `lib/member/link.ts`.

### Task 5: Member, sign-up, login
**Files:** `components/member/MemberView.tsx`, `lib/member/logic.ts` (+test), `lib/session.ts`, auth forms.
- Pending banner on the member page; remove the vehicle row.
- `validateSignup` rejects `+` in the local part; sign-in "no record" message.

### Task 6: Portal and landing
**Files:** `lib/portal/*`, `components/portal/*`, landing copy.
- Drop vehicle type from portal vehicles, waitlist, alerts; single waitlist.

### Task 7: Verify
- [ ] lint, typecheck, test, build; browser pass on roster, scan flow, member page, sign-up.
