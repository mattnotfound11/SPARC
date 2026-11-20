# Member Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Registered students/personnel sign in with a real login and see their own pass, profile, parking history, live count, and can send one-way suggestions to admins.

**Architecture:** A `members` table links a Supabase login to a `users` row; security-definer functions plus row-level policies confine members to their own rows. The app adds a member session beside the staff session, a `/member` page with its own small data layer (not the admin-wide `ConsoleData`), and an admin-only `/admin/suggestions` page. Dev mode (no Supabase) uses a mock member and localStorage so `npm run dev` works.

**Tech Stack:** Next.js (App Router) in `caps-landing`, Supabase (Auth + Postgres RLS), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-member-role-design.md`

## Global Constraints
- Times are ms since 1970 (bigint in SQL, number in TS).
- Suggestion categories exactly: `Parking`, `Safety`, `Pass or billing`, `Other`; message max 1000 chars; max 5 suggestions per member per day.
- Visitors cannot be linked as members; `link_member` is admin-only.
- Members are read-only except inserting suggestions.
- Follow existing patterns: `lib/session.ts`, `lib/mockSession.ts`, tests as `*.test.ts` with Vitest (`npm run test` from repo root).

## Review Focus
- Pass expiring today / already expired / exactly 7 days left: warning states correct (Task 1 tests).
- Exit with no matching entry, or entry still open (member currently parked): history shows it without crashing (Task 1 tests).
- A member session opening `/admin`: not treated as staff and not stuck on a spinner (Task 3).
- Empty history / no linked record: page shows an explanatory empty state, not an error (Task 5).
- Suggestion that is empty, whitespace-only, or over 1000 chars is rejected (Task 1 tests).

---

### Task 1: Pure member logic
**Files:** Create `caps-landing/src/lib/member/logic.ts`, Test `caps-landing/src/lib/member/logic.test.ts`

**Interfaces — Produces:**
- `type PassState = { kind: "active" | "expiring" | "expired"; daysLeft: number }`
- `passState(expiresAt: number, now: number): PassState` — `expired` if `expiresAt <= now`; `expiring` if ≤ 7 whole days left (ceil); else `active`; `daysLeft` = ceil days, min 0.
- `type Visit = { visitId: string | null; entryAt: number | null; exitAt: number | null; floor: number | null; slot: string | null; gate?: string }`
- `buildVisits(logs: LogEntry[]): Visit[]` — pairs by `visitId`; entries without `visitId` or exits without an entry become their own half-open Visit; newest first by `entryAt ?? exitAt`.
- `SUGGESTION_CATEGORIES: readonly ["Parking","Safety","Pass or billing","Other"]`, `type SuggestionCategory`
- `SUGGESTION_MAX = 1000`, `SUGGESTION_DAILY_LIMIT = 5`
- `validateSuggestion(category: string, message: string): string | null` (error text or null)
- `type AccountType = "admin" | "facilitator" | "member"`; `homeFor(type: AccountType): string` → `/admin` for staff, `/member` for member.

- [ ] Write failing tests: `passState` (expired, today, 7 days → expiring, 8 → active); `buildVisits` (paired, open entry, orphan exit, ordering); `validateSuggestion` (empty, whitespace, 1001 chars, bad category, ok → null); `homeFor`.
- [ ] Run `npm run test -w caps-landing -- member` → fails (module missing).
- [ ] Implement `logic.ts` to satisfy them.
- [ ] Run again → passes.

### Task 2: Database
**Files:** Modify `supabase/schema.sql`, `supabase/lock-down.sql`, `docs/supabase-setup.md`

- [ ] Append to `schema.sql` (idempotent): `members(user_id uuid pk → auth.users on delete cascade, registered_user_id text unique not null → users(id) on delete cascade)` with RLS on and no policies; `member_user_id()` security definer returning the caller's `registered_user_id`; `account_type()` returning `admin|facilitator|member|null` (reuse `staff_role()` first); `suggestions(id uuid pk default gen_random_uuid(), registered_user_id text not null, category text check in the four categories, message text check (char_length(message) between 1 and 1000), created_at bigint not null, status text not null default 'new' check in ('new','read','resolved'))` with RLS: members `insert` where `registered_user_id = member_user_id()` and fewer than 5 rows in the last 24h; members `select` own; admins (`staff_role()='admin'`) `select` all and `update`; `link_member(p_email text, p_user_id text) returns text` security definer, admin-only, rejects visitor role and unknown email/user, upserts into `members`, returns `'ok'` or an error string. Grant execute to `authenticated` only.
- [ ] In `lock-down.sql` add member read policies: `users` select where `id = member_user_id()`; `logs` select where `user_id = member_user_id()`; revoke `anon` on suggestions/members.
- [ ] In `docs/supabase-setup.md` add a "Members" section: create the Supabase account, link via Users page (or `select link_member(...)`), and note privacy is only real after `lock-down.sql`.
- [ ] Verify: SQL reads cleanly, no references to undefined objects (no live DB available; state this).

### Task 3: Sessions and sign-in routing
**Files:** Modify `lib/mockSession.ts`, `lib/session.ts`, `components/auth/LoginForm.tsx`, `components/auth/AdminLoginForm.tsx`, `lib/staffLogins.ts`; Test `lib/session.test.ts`

**Interfaces — Produces (`lib/session.ts`):**
- `signInAccount(email: string, password: string): Promise<{ error: string } | { type: AccountType }>`
- `type MemberSession = {status:"loading"} | {status:"out"} | {status:"in"; email: string; registeredUserId: string | null}`; `useMemberSession(): MemberSession`
- `mockSession`: `DEMO_MEMBER = { email: "member@usa.edu.ph", name: "Demo Member" }`, `signInMember` shares the existing sessionStorage key with `role: "member"`; the staff `useAdminSession` returns `out` for a stored member.

- [ ] Test: staff mock `useAdminSession` logic treats a stored `role:"member"` as signed out for staff (export a small pure `isStaffRole(role: unknown): role is StaffRole` and test it).
- [ ] Implement mock member support and `signInAccount` (Supabase: `signInWithPassword` then `account_type` RPC; null type → sign out, error "This account isn't linked to a SPARC pass. Ask an administrator."; mock: staff or member demo accounts with `DEMO_PASSWORD`).
- [ ] Staff `lookup` must not sign out when `account_type` is `member`; staff session becomes `out`. `useMemberSession` resolves via `account_type` + `member_user_id` RPCs.
- [ ] `LoginForm`: replace the fake "unavailable" flow with real `signInAccount`, then `router.replace(homeFor(type))`; show errors with `FormNotice`; already-signed-in member redirects to `/member`. List the demo member login under staff logins (`staffLogins.ts`).
- [ ] `AdminLoginForm`: if a member session is active, `router.replace("/member")`.
- [ ] Run tests, typecheck.

### Task 4: Member data layer
**Files:** Create `lib/member/data.ts`; Test `lib/member/data.test.ts`

**Interfaces — Produces:**
- `type MemberData = { user: RegisteredUser; logs: LogEntry[] }`
- `type Suggestion = { id: string; registeredUserId: string; userName: string; category: SuggestionCategory; message: string; createdAt: number; status: "new"|"read"|"resolved" }`
- `loadMemberData(): Promise<MemberData | null>` (null = no linked record)
- `sendSuggestion(category: string, message: string): Promise<string | null>` (error or null; validates via `validateSuggestion` and the daily limit)
- `listMySuggestions(): Promise<Suggestion[]>`, `listAllSuggestions(): Promise<Suggestion[]>`, `setSuggestionStatus(id: string, status: Suggestion["status"]): Promise<string | null>`
- Supabase path queries `users`/`logs`/`suggestions` (RLS limits rows); mock path reads the sample store from localStorage (`STORAGE_KEY` via `createSparcStore`, load sample if empty; demo member = first `student` user) and keeps suggestions in a localStorage key `sparc_suggestions_v1`.

- [ ] Test the mock path with an in-memory storage stub: `sendSuggestion` rejects invalid input, enforces 5/day, `listMySuggestions` newest first, `setSuggestionStatus` persists.
- [ ] Implement both paths behind `getSupabase()`; map rows with `userFromRow`/log mapping already in `lib/supabase/sync.ts` (export the log mapper if not exported).
- [ ] Run tests.

### Task 5: Member page
**Files:** Create `app/member/layout.tsx`, `app/member/page.tsx`, `components/member/MemberShell.tsx`, `components/member/MemberView.tsx`

- [ ] `MemberShell`: header (SparcWordmark, signed-in email, Sign out via `signOut`), redirects signed-out visitors to `/login`; staff sessions are sent to `/admin`.
- [ ] `MemberView`: sections Pass (state from `passState`, expiry date, days left, colour by kind), Profile (name, role, ID, vehicle, active), Live availability (reuse `useSharedAvailability` display like `LiveSlotCount`, wrapped in the providers it needs), My parking history (`buildVisits`, date + time, floor, slot, gate; empty state), Suggestions (category select, textarea with counter, submit, list of sent items with status). No-linked-record state explains "Ask an administrator to link your pass".
- [ ] Use existing design tokens/classes from the portal and console (`c-input`, `display`, `bg-canvas`, etc.).
- [ ] Verify with `npm run typecheck` and a dev-server look using the mock member login.

### Task 6: Admin suggestions inbox
**Files:** Create `app/(console)/admin/suggestions/page.tsx`, `components/console/SuggestionsView.tsx`; Modify `lib/session.ts` (`ADMIN_ONLY_PATHS`), `components/console/ConsoleShell.tsx` (NAV entry, icon `Inbox`)

- [ ] Add `/admin/suggestions` to `ADMIN_ONLY_PATHS` and update the `canAccess` test.
- [ ] Table: sender, category, message, time, status control (new/read/resolved) calling `setSuggestionStatus`; empty and error states.

### Task 7: Link a member login on the Users page
**Files:** Modify `components/console/UserPanel.tsx` (edit mode, non-visitor users only); Create `lib/member/link.ts`

- [ ] `linkMemberLogin(email: string, registeredUserId: string): Promise<string | null>` calling RPC `link_member`; in mock mode returns an explanatory message.
- [ ] Add a "Member login" email field with a Link button in the edit panel; show success/error via the existing toast.

### Task 8: Verification
- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass.
- [ ] Manual (dev server, mock logins): member login lands on `/member` with data; staff login lands on `/admin`; member opening `/admin` ends on `/member`; suggestion sent appears in `/admin/suggestions`.
