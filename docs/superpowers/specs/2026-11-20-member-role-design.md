# Member role: design

## Intent and why
Registered students and personnel who hold a monthly pass currently have no real account. The driver portal at `/portal` asks for a card number and keeps its data in the browser. A **Member** is a registered student or personnel user who signs in with a real login and sees only their own parking data, plus a way to send suggestions to staff.

## Goals
- Members sign in with email and password (Supabase Auth) at `/login`, and land on `/member`.
- `/member` shows: their profile (name, role, student/employee ID, vehicle class, active status); pass expiry (date, days left, expired/expiring warning); their own parking history (date and time of each entry and exit, floor, slot, gate); the live slot count.
- A suggestions box: category (Parking, Safety, Pass or billing, Other) plus free text. One-way: members can see what they sent and when, staff cannot reply.
- Administrators read suggestions on a new `/admin/suggestions` page and mark them read or resolved.
- The database, not just the UI, enforces that a member only reads their own rows.

## Non-goals
- No staff replies to suggestions, no threads, no notifications.
- No self-service signup that creates a pass. The Sign up form stays as it is.
- Members cannot edit their profile, renew a pass, or change vehicle.
- Visitors do not get member accounts (visitor role is excluded).
- No change to the existing `/portal` (kept as is; folding it in is a later decision).

## Anti-goals (failure even if it works)
- A member being able to see another member's name, ID, logs or suggestions.
- A member being able to link their login to someone else's registered record.
- Locking out staff or breaking the gate scanner.

## Constraints
- Stack is Next.js (`caps-landing`) with Supabase; follow the existing session pattern in `src/lib/session.ts` (real Supabase auth, dev-only mock fallback in `src/lib/mockSession.ts`, so `npm run dev` works with no setup).
- Times are milliseconds since 1970 (bigint), matching the existing schema.
- Existing tables are open access ("public mode") until `supabase/lock-down.sql` is run. Member privacy is only real once the database is locked down; the doc and migration must say so.

## Approaches considered
- **A. Real accounts linked to registered users (chosen).** New `members` table maps a Supabase login to a `users` row; row-level security restricts members to their own rows; new `/member` and `/admin/suggestions` pages. Cost: one migration and lock-down changes.
- **B. Same UI, browser-only data.** Cheap, but not a real login and staff never see suggestions. Rejected.
- **C. Fold into `/portal`.** Reuses vehicles and violations, but inherits browser-only storage and a vehicle/violation focus. Rejected.

## Design (parts decided)
**Data** (new in `supabase/schema.sql`, and in `lock-down.sql` for the policies):
- `members (user_id uuid pk references auth.users, registered_user_id text unique references users(id))`. No direct read policy; accessed through functions.
- `member_user_id()` security-definer function returns the caller's registered user id (null if not a member).
- `staff_role()` stays staff-only. A new `account_type()` (or equivalent) returns `admin`, `facilitator`, `member` or null so the app can route after sign-in.
- Policies (after lock-down): members can `select` their own `users` row and their own `logs` rows (`user_id = member_user_id()`); they get no access to `scans` or other users' rows. Staff policies unchanged.
- The live slot count is already publicly readable (`sparc_availability`); the member page reuses it.
- `suggestions (id, registered_user_id, category, message, created_at, status in ('new','read','resolved'))`. Members can insert and select their own; admins can select all and update status; facilitators have no access.

**Linking:** an administrator links an account to a registered user (Users page gets a "Member login" field: email of an existing Supabase account, or documented SQL in `docs/supabase-setup.md`). Matching is by the admin's explicit choice, never by self-claim.

**App:**
- `session.ts`: add a member session alongside the staff session, `useMemberSession()`, with the same mock fallback (a demo member linked to a seeded registered user, shown with the other demo logins).
- `LoginForm`: wire to real sign-in; after sign-in route by account type (`admin`/`facilitator` to `/admin`, `member` to `/member`). Staff sign-in at `/admin/login` keeps working. A member who opens `/admin` is sent to `/member`, and staff opening `/member` are sent to `/admin`.
- `/member` page and a small `MemberShell` (reusing the console's visual language and the live-count component from the landing page). Sections: Pass (expiry and days left), Profile, Live availability, My parking history (newest first, entry/exit pairs), Suggestions form and "Sent" list.
- `/admin/suggestions`: admin-only (add to `ADMIN_ONLY_PATHS`), table with category, message, who sent it, when, status control.

## Left to the builder
Exact visual layout, copy, empty states, history pagination, and the form for linking a login on the Users page. Tests: follow existing unit-test style (`*.test.ts`) for session routing, history pairing, and expiry-state logic.

## Open items I decided (my calls)
- Members cannot edit anything.
- Suggestion categories: Parking, Safety, Pass or billing, Other.
- Suggestion length capped (e.g. 1000 characters) and rate-limited by a simple per-member daily cap.
- Visitors excluded from member accounts.
