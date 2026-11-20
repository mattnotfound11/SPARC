# Merge Reports and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One admin **Reports** page (month based) that keeps the entries-based busy-hours views and drops stay-time and hourly "vehicles inside" tracking.

**Architecture:** Reuse the existing `AnalyticsView` as the merged page (it already has month picker, print, CSV, heatmap, entries per hour, decks, gates, violations). Add a per-day entries/exits bar chart in place of the old Daily report. Delete the old day-based `ReportsView` and its hourly charts. Route `/admin/analytics` to `/admin/reports`.

**Tech Stack:** Next.js (static export, App Router), React, Vitest.

**Spec (approved in conversation, 2026-11-20):** keep Entries per hour, Busiest time tile, busiest-times heatmap, per-gate entries/exits with peak hour, entries per deck, violations count and weekly trend, print and CSV. Remove Average stay (tile, deck column, CSV column), the "Vehicles inside" hourly chart and the hourly daily CSV. Add "Entries and exits per day". Month picker only. Leave `/portal` forecast alone.

## Global Constraints
- Page title "Reports", nav label "Reports", path `/admin/reports`; admin-only (`ADMIN_ONLY_PATHS` keeps both paths so the redirect page is also protected).
- No new dependencies; follow existing component/class conventions (`Panel`, `PanelHeader`, `data-bar`, `data-enter`).

## Review Focus
- A month with no entries: per-day chart panel is hidden with the rest (existing empty state still shows).
- Current month: days that haven't happened yet show no bar and no crash (Task 1 test).
- Visits spanning midnight: entry and exit counted on their own days (Task 1 test).
- Opening the old `/admin/analytics` URL lands on `/admin/reports` (Task 3).

### Task 1: `dailyFlow` and stay removal in analytics lib
**Files:** Modify `caps-landing/src/lib/analytics/analytics.ts`, `caps-landing/src/lib/analytics/analytics.test.ts`

**Interfaces — Produces:**
- `type DayFlow = { start: number; label: string; entries: number; exits: number }`
- `dailyFlow(logs: LogEntry[], m: Month, now: number): DayFlow[]` — one item per elapsed day of the month, oldest first; `label` is the day of month as a string (`"1"`..); counts by local calendar day.
- `DeckStat` loses `avgStayMin`; `formatStay` is removed; `monthlyRows` drops the "Average stay (min)" column and adds a section `["Day", "Entries", "Exits"]` listing `dailyFlow` rows (new optional arg `daily?: DayFlow[]`).

- [ ] Tests: `dailyFlow` counts entries and exits per local day, includes zero days, stops at today for the current month, handles an exit the day after its entry; `deckStats` no longer has `avgStayMin` (update the stay tests: keep entries and turnover assertions, delete stay ones and the `formatStay` test); `monthlyRows` has no "Average stay" header and includes the daily section.
- [ ] Run `npm run test -w caps-landing -- analytics` → new tests fail.
- [ ] Implement; run again → pass.

### Task 2: Merged Reports view
**Files:** Modify `caps-landing/src/components/console/AnalyticsView.tsx` (export renamed `ReportsView`, file renamed to `ReportsView.tsx` replacing the old one); Delete old `ReportsView.tsx`, `HourlyCharts.tsx`

- [ ] `git mv`/replace so `components/console/ReportsView.tsx` exports `ReportsView` containing the former Analytics content.
- [ ] Title "Reports"; description "When the building is busy and how often rules are broken. {month}."; summary tiles: Entries, Exits, Busiest time, Violations (add exits count for the month); remove Average stay tile and the `overallStay`/`stayEntries` code.
- [ ] Decks table: drop the Avg stay column; update caption and footnote (bay turnover only).
- [ ] Add "Entries and exits per day" panel using `dailyFlow` (two series: entries gold, exits `bg-ink-soft/70`; labels every few days; `sr-only` table; `data-bar` animation like the other charts); pass `daily` to `monthlyRows`; CSV filename stays `sparc-monthly-report-<key>.csv`.
- [ ] Delete `HourlyCharts.tsx` and verify nothing else imports it.

### Task 3: Routes and nav
**Files:** Modify `app/(console)/admin/reports/page.tsx`, `app/(console)/admin/analytics/page.tsx`, `components/console/ConsoleShell.tsx`

- [ ] `/admin/reports` page renders the merged `ReportsView` (title "Reports · Admin").
- [ ] `/admin/analytics` page becomes a small client component that `router.replace("/admin/reports")` and renders a "Moved to Reports" link as fallback.
- [ ] Remove the Analytics entry from `NAV` (and the unused `TrendingUp` import).

### Task 4: Verify
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all pass.
- [ ] Browser (dev server): `/admin/reports` shows tiles, per-day chart, heatmap, entries per hour, decks without stay, gates, violations; `/admin/analytics` forwards; nav has no Analytics; facilitator still blocked.
