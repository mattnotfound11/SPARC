# Single Gate and Reports Chart Redesign Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Treat the building as one entrance/exit gate everywhere, and rebuild every Reports chart with Recharts following the dataviz rules.

**Architecture:** Remove the gate split (constant `GATE` replaces `GATES`; scan dropdown, gate panel, `gateStats` and the gates CSV section go). New small chart components under `components/console/charts/` (Recharts, client only) replace the hand-built CSS bars in `ReportsView`. Pure data helpers stay in `lib/analytics/analytics.ts` with tests.

**Tech Stack:** Next.js (static export), React 19, Recharts 3, Vitest.

**Spec (approved in conversation, 2026-11-20):** one gate; summary tiles with trend lines; per-day area chart (entries vs exits); heatmap with color-scale legend and hour axis; entries-per-hour bars with the peak hour highlighted and an exits line; decks as horizontal bars stacked like the building (Level 5 on top); violations stacked bars by week with legend and hover totals.

## Global Constraints
- Dataviz marks: bars max 24px with 4px rounded data end, 2px lines, area wash about 10% opacity, hairline recessive grid, 2px surface gap between stacked segments, tooltips on every chart, legend for 2+ series, table view (`sr-only` table) for each chart, text never in series color.
- Colors (validated on surface `#0f121a`): entries gold `#f5b301` (brand accent), exits blue `#3987e5`; violation types overstay `#3987e5`, overnight `#d95926`, second entry `#199e70`, temporary `#9085e9`.
- No database change: `LogEntry.gate` stays an optional field, old values ignored.

## Review Focus
- Empty month, a month with a single day of data, and a current month with future days: no chart crashes or NaN (Task 2 tests, Task 3 checks).
- Old logs carrying "Main gate"/"Side gate" still load and count.
- Prior month with no data: the change-vs-last-month note is hidden, not "NaN%" or infinity (Task 2 test).

### Task 1: One gate
**Files:** Modify `lib/sparc/seed.ts`, `lib/sparc/sample.ts`, `lib/sparc/store.ts`, `components/console/ScanView.tsx`, `components/screens/PassPhone.tsx`, `components/site/StatStrip.tsx`, `components/site/FeatureRows.tsx`, related tests.
- [ ] `seed.ts`: replace `GATES` with `export const GATE = "Entrance / Exit"`; update store/sample/ScanView imports; sample data uses `GATE`; scan default gate is `GATE`.
- [ ] `ScanView`: remove the "This device is at" dropdown and gate state; `store.scan(serial, mode)`.
- [ ] Landing copy: "4 gates on one dashboard" becomes "Entry and exit on one dashboard"; chip "4 gates" becomes "1 gate"; phone mock labels "Entrance"/"Exit".
- [ ] Update any test importing `GATES`; run tests and typecheck.

### Task 2: Analytics helpers (TDD)
**Files:** Modify `lib/analytics/analytics.ts`, `lib/analytics/analytics.test.ts`
**Produces:**
- `hourlyFlow(logs: LogEntry[], m: Month, now: number): { hour: number; entries: number; exits: number }[]` — 24 items, average per elapsed day.
- `monthChange(logs: LogEntry[], months: Month[], index: number, now: number): number | null` — percent change of entries per elapsed day versus the previous month; `null` when the previous month has no entries or there is no previous month.
- Remove `gateStats`, `GateStat`, and the gates section of `monthlyRows`.
- [ ] Tests first for `hourlyFlow` (averages, exits counted), `monthChange` (up, down, null), CSV without a gates section.
- [ ] Implement; tests pass.

### Task 3: Charts and Reports view
**Files:** Create `components/console/charts/chartTheme.ts`, `Sparkline.tsx`, `FlowAreaChart.tsx`, `HourlyChart.tsx`, `HeatmapChart.tsx`, `DeckBars.tsx`, `ViolationBars.tsx`; Modify `components/console/ReportsView.tsx`
- [ ] `chartTheme.ts`: exported color constants above and the shared axis/grid/tooltip props.
- [ ] Each chart: Recharts, themed tooltip, `sr-only` table, aria label, empty-safe.
- [ ] `ReportsView`: summary tiles with sparkline and the change-vs-last-month note; replace each panel's hand-built chart; remove gate panel and unused code.

### Task 4: Verify
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass.
- [ ] Browser (dev server): Reports page renders every chart, tooltips work, Entry / Exit scan page has no gate dropdown, landing page copy updated.
