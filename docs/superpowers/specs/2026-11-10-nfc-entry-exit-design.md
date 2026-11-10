# NFC registration and entry/exit scanner — design

Date: 2026-11-10 · Scope: prototype (caps-landing admin console)

## Goal
Let an admin (1) register a driver by scanning their NFC card and (2) record vehicle entry/exit by scanning,
updating the live slot count, with clear pass-status feedback.

## Decisions
- Reader: Android Chrome Web NFC (`NDEFReader`). Needs HTTPS or localhost; user gesture required to start.
- Data: phone is the console. Existing in-memory store, no backend; data resets on reload.
- Card ID: the scanned serial is saved as the user's NFC ID (uppercase hex, colon-separated, e.g. `04:A1:B2:C3`).
  Legacy digit IDs (`1234-5678-9012`) remain valid. Matching is case-insensitive.
- Warning copy: "Invalid monthly pass" / "Pass expired" (no other wording).

## Out of scope
Supabase/shared backend, iOS (no Web NFC), writing to cards, hardware gate (ESP8266), public signup form changes.
The production target is dedicated hardware + Supabase; the store and reader boundaries are kept swappable for that.

## Components
1. **Reader layer** `src/lib/nfc/`: `useNfcReader` hook -> `{ supported, scanning, error, start(), stop() }` plus
   `onScan(serial)` callback. States: unsupported, permission denied, NFC off, read error, ready.
   Normalizes serials. Knows nothing about the store.
2. **Store** (`store.ts`, `types.ts`): `validateUser` accepts hex serials. New `scan(nfcId)` returns
   `unregistered | no-pass (inactive) | expired | full | entered | exited`.
   Entry assigns a free slot matching the user's vehicle class; exit frees it. Every scan, including rejected
   ones, appears in a recent-scans list; only entries/exits go to the audit log (report code treats non-entry logs as exits). A driver already parked can always exit, even with an expired pass. Live count derives from the existing slot map via selectors.
3. **Entry / Exit page** `/admin/scan` + sidebar `NAV` item: enable-NFC button, live free/total count (by floor),
   result card, recent-scans list. Valid pass: profile (name, role, plate, vehicle), green "Active" badge,
   days left (amber at 5 days or fewer). Invalid: red banner, no slot assigned.
4. **Register by scan**: "Scan card" button on the Users add/edit form fills the NFC ID field; manual typing stays.
   Other fields typed by the admin. Duplicate IDs hit the existing error.

## Testing
Unit tests for `scan()` (valid, expired, inactive, unregistered, full, entry then exit, hex case-insensitivity),
reader mocked. Manual check on an Android phone for real reads.

## Open items
None.
