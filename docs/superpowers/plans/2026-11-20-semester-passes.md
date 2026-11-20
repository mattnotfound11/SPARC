# Semester Passes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A pass runs to the end of a semester (two per college year) instead of one month, and the admin edits the semester dates.

**Architecture:** Pure helpers in `lib/semesters/semesters.ts` (find the pass end, validate, date conversion), a small data layer `lib/semesters/data.ts` (Supabase table `semesters`, localStorage in dev) with a `useSemesters` hook, an admin page `/admin/semesters`, and `activateUser`/`renewUser` taking the expiry date from the caller. The gate, expiry checks and warnings only read `expiresAt`, so they don't change.

**Tech Stack:** Next.js (static export), Supabase, Vitest.

**Spec (approved in conversation, 2026-11-20):** passes end with the semester; activating during a semester runs to its end, in a break to the next semester's end; renewing runs to the end of the next semester; the admin edits semester dates; "expiring soon" stays 3 days; wording changes from monthly to semester. No dates are guessed: the production table starts empty and activation/renewal are blocked until dates exist.

## Global Constraints
- A semester covers `startsAt` (start of its first day) to `endsAt` (end of its last day), local time. No overlaps, end after start.
- `passEndAfter(semesters, after)` = the earliest `endsAt` greater than `after`; null when none. Activation uses `after = now`; renewal uses `after = max(now, current expiresAt)`.
- Passes already activated keep their end date when semester dates are edited.
- Reports and CSV stay "monthly" (they describe traffic, not passes).

## Review Focus
- Activating on the last day of a semester, in a break, and before the first semester: right end date each (Task 1 tests).
- Renewing a pass that is active (goes to the next semester) versus expired (goes to the current or next) (Task 1 tests).
- No semesters set, or all in the past: activation and renewal explain it and link to the page, no crash (Task 3).
- Overlapping or backwards dates cannot be saved (Task 1 tests, Task 2).

### Task 1: Pure helpers (TDD)
`lib/semesters/semesters.ts` + test: `Semester` type, `passEndAfter`, `validateSemesters`, `dateToStart`, `dateToEnd`, `toDateInput`, `defaultSemesters(now)` for the dev demo.

### Task 2: Data layer and page
`lib/semesters/data.ts` (`loadSemesters`, `saveSemesters`, `useSemesters`), `SemestersView` at `/admin/semesters`, nav item and admin-only path, `semesters` table in `supabase/schema.sql` and `lock-down.sql`.

### Task 3: Store and screens
`store.activateUser(id, nfcId, expiresAt)` and `renewUser(id, expiresAt)`; `UserPanel` and `RenewConfirm` read the end date and block with a link when there are no semesters; copy changes from monthly to semester.

### Task 4: Verify
lint, typecheck, test, build; browser check of the page, activation and renewal.
