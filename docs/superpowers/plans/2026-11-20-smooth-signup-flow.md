# Smooth Sign-up Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Sign-up goes form, confirmation email, inbox click, then an explicit log in, with no dead ends whatever order the parking office and the student act in.

**Architecture:** Pure helpers in `lib/member/logic.ts` (tested) classify email-link results and sign-in errors. `lib/session.ts` gains `resendConfirmation` and richer results from `signUpMember` and `signInAccount`. `SignupForm` gets a "Check your email" screen with resend; `LoginForm` shows the "Email confirmed" and "link expired" banners, signs out the auto-session from the link, and offers resend. A new database trigger on `public.users` links any confirmed matching account when a student is registered or edited.

**Tech Stack:** Next.js (static export), Supabase Auth and Postgres, Vitest.

**Spec (approved in conversation, 2026-11-20):** see the design message: resend with 60 s wait, confirmation lands on log in with a banner and a forced sign-in, order-independent linking, friendly errors for unconfirmed / unlinked / already registered, SPARC email template text.

## Global Constraints
- Resend wait is 60 seconds. Matching rules are unchanged: `@usa.edu.ph`, student or personnel, active card, same ID and same name ignoring case and spacing, not already linked.
- Sign-up never reveals whether an ID or name is registered.
- Redirect URL stays `<origin>/login` (no query string, so the Supabase allow-list entry still matches).

## Review Focus
- Link opened after it expired or twice: friendly message and a way to get a new one (Task 1 tests).
- Student registered after the account was confirmed, and edited name or ID later: still linked once (Task 4).
- Two confirmed accounts matching one student: only the earliest links; no crash (Task 4).
- Email already registered: no second email is sent, and the screen says to log in (Task 2).

### Task 1: Pure helpers (TDD)
**Files:** Modify `lib/member/logic.ts`, `lib/member/logic.test.ts`
- `parseEmailLink(hash: string): "confirmed" | "expired" | null` — `confirmed` when the fragment has `access_token` and `type` of `signup` or `email`; `expired` when it has `error_code=otp_expired` or `error=access_denied`; otherwise null.
- `classifySignInError(e: { status?: number; code?: string }): "unconfirmed" | "wrong" | "offline"` — `unconfirmed` for code `email_not_confirmed`; `wrong` for other 4xx; `offline` otherwise.
- [ ] Tests first, then implement.

### Task 2: Session functions
**Files:** Modify `lib/session.ts`
- `signUpMember` returns `{ ok: true } | { exists: true } | { error: string }` (`exists` when the service returns a user with no identities).
- `resendConfirmation(email: string): Promise<string | null>` (error text or null).
- `signInAccount` returns `{ error: string; kind?: "unconfirmed" | "unlinked" }` on failure, using `classifySignInError`.

### Task 3: Screens
**Files:** Modify `components/auth/SignupForm.tsx`, `components/auth/LoginForm.tsx`
- Sign-up: "Check your email" screen with Resend (60 s wait) and "Wrong address? Start over"; "already has an account" notice with a Log in link.
- Log in: banner for `confirmed` (and sign out the link's auto-session, then clean the URL hash) or `expired`; unconfirmed error shows a Resend button; unlinked shows a notice, not a failure.

### Task 4: Database trigger
**Files:** Modify `supabase/schema.sql`; apply as a migration
- `claim_pass_for_user()` after insert or update of (student_id, name, role, active) on `public.users`; SECURITY DEFINER; EXECUTE granted to anon, authenticated, service_role (the roles that write `users`).
- [ ] Test with a throwaway student after removing the test link; clean up.

### Task 5: Email template and docs
- [ ] SPARC-branded "Confirm signup" text for the Supabase template, in `docs/supabase-setup.md`, with the SMTP note.

### Task 6: Verify
- [ ] lint, typecheck, test, build; browser check of the new screens on localhost.
