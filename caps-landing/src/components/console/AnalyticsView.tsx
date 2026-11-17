"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEnter } from "@/hooks/useConsoleMotion";
import {
  WEEKDAYS,
  WEEK_ORDER,
  deckStats,
  formatStay,
  hourLabel,
  gateStats,
  hourlyEntries,
  logsIn,
  monthlyRows,
  months,
  violationWeeks,
  weekdayHour,
} from "@/lib/analytics/analytics";
import { sampleHistory } from "@/lib/forecast/forecast";
import { usePortalState } from "@/lib/portal/usePortal";
import type { ViolationType } from "@/lib/portal/types";
import { downloadCsv } from "@/lib/sparc/csv";
import { useSparcState } from "@/lib/sparc/SparcProvider";
import { EmptyState, PageHeader, Panel, PanelHeader, useToast } from "./ui";

gsap.registerPlugin(useGSAP);

const FIRST_HOUR = 5;
const LAST_HOUR = 22;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

const VIOLATION: Record<ViolationType, { label: string; swatch: string }> = {
  overstay: { label: "Overstay", swatch: "bg-gold" },
  overnight: { label: "Overnight", swatch: "bg-crimson" },
  "anti-passback": { label: "Second entry without exit", swatch: "bg-ink-soft/70" },
  temporary: { label: "Temporary vehicle", swatch: "bg-live" },
};

export function AnalyticsView() {
  const root = useRef<HTMLDivElement>(null);
  const heatRef = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  const portal = usePortalState();
  const toast = useToast();
  const [pick, setPick] = useState<boolean | null>(null);
  // The demo account turns the sample history on by itself, until real gate traffic exists
  const sample = pick ?? (portal.demo === true && state.logs.length === 0);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [hover, setHover] = useState<{ weekday: number; hour: number } | null>(null);
  useEnter(root);

  const now = state.now;
  const options = useMemo(() => months(now, 6), [now]);
  const month = options.find((m) => m.key === monthKey) ?? options[0];

  const logs = useMemo(() => (sample ? sampleHistory(state.config, now, 60) : state.logs), [sample, state.config, state.logs, now]);
  const inMonth = useMemo(() => logsIn(logs, month), [logs, month]);
  const entries = useMemo(() => inMonth.filter((l) => l.event === "entry").length, [inMonth]);
  const heat = useMemo(() => weekdayHour(logs, month, now), [logs, month, now]);
  const decks = useMemo(() => deckStats(logs, state.config, month, now), [logs, state.config, month, now]);
  const hourly = useMemo(() => hourlyEntries(logs, month, now), [logs, month, now]);
  const gate = useMemo(() => gateStats(logs, month, now), [logs, month, now]);
  // A dismissed violation was cancelled, so it doesn't count toward the trend
  const standing = useMemo(() => portal.violations.filter((v) => v.status !== "dismissed"), [portal.violations]);
  const weeks = useMemo(() => violationWeeks(standing, now, 8), [standing, now]);
  const monthViolations = standing.filter((v) => v.at >= month.start && v.at < month.end).length;

  const stayEntries = decks.filter((d) => d.avgStayMin !== null);
  const stayWeight = stayEntries.reduce((n, d) => n + d.entries, 0);
  const overallStay = stayWeight ? stayEntries.reduce((n, d) => n + (d.avgStayMin as number) * d.entries, 0) / stayWeight : null;

  const maxHourly = Math.max(0, ...hourly);
  const maxWeek = Math.max(0, ...weeks.map((w) => w.total));
  const maxEntries = Math.max(1, ...decks.map((d) => d.entries));
  const empty = entries === 0;
  const active = hover ? heat.grid[hover.weekday][hover.hour] : null;

  // The grid fills in when the month (or the data) changes
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-cell]", { opacity: 0, scale: 0.6, duration: 0.45, ease: "power3.out", stagger: { amount: 0.6, from: "start" }, clearProps: "opacity,transform" });
        gsap.from("[data-bar]", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.6, ease: "power3.out", stagger: 0.015, clearProps: "transform" });
      });
    },
    { scope: root, dependencies: [month.key, empty, sample], revertOnUpdate: true },
  );

  function exportCsv() {
    downloadCsv(`sparc-monthly-report-${month.key}.csv`, monthlyRows({ month, heat, decks, hourly, violations: weeks, entries, gates: gate.gates }));
    toast(`Exported the report for ${month.label}.`);
  }

  const summary = [
    { label: "Entries", value: String(entries) },
    { label: "Average stay", value: formatStay(overallStay) },
    { label: "Busiest time", value: heat.peak ? `${WEEKDAYS[heat.peak.weekday].slice(0, 3)} ${hourLabel(heat.peak.hour)}` : "n/a", note: heat.peak ? `${heat.peak.average.toFixed(1)} entries on average` : undefined },
    { label: "Violations", value: String(monthViolations) },
  ];

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Analytics"
        description={`When the building is busy, how long cars stay, and how often rules are broken. ${month.label}.`}
        actions={
          <>
            <label htmlFor="an-month" className="sr-only">
              Month
            </label>
            <select id="an-month" className="c-input print:hidden" value={month.key} onChange={(e) => setMonthKey(e.target.value)}>
              {options.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <button type="button" className="c-btn print:hidden" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Print / save as PDF
            </button>
            <button type="button" className="c-btn c-btn-gold print:hidden" onClick={exportCsv}>
              <Download className="size-4" aria-hidden />
              Download CSV
            </button>
          </>
        }
      />

      {empty && (
        <Panel data-enter>
          <EmptyState
            title={`No entries in ${month.label}`}
            action={
              sample ? undefined : (
                <button type="button" className="c-btn" onClick={() => setPick(true)}>
                  Show with sample history (demo)
                </button>
              )
            }
          >
            Charts fill in from the entry log once cars use the gate. Pick another month, or load sample history to see the layout.
          </EmptyState>
        </Panel>
      )}

      {!empty && (
        <>
          <Panel data-enter aria-label={`Summary for ${month.label}`} className="p-4 sm:p-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-line">
              {summary.map(({ label, value, note }, i) => (
                <div key={label} className={i > 0 ? "lg:pl-6" : ""}>
                  <dt className="text-sm text-ink-muted">{label}</dt>
                  <dd className="num mt-1 font-display text-[1.75rem] leading-none font-semibold tracking-tight text-ink">{value}</dd>
                  {note && <p className="mt-1 text-xs text-ink-muted">{note}</p>}
                </div>
              ))}
            </dl>
          </Panel>

          <Panel data-enter aria-labelledby="heat-title">
            <PanelHeader id="heat-title" title="Busiest times" />
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <p className="mb-3 min-h-5 text-sm text-ink-muted" aria-live="polite">
                {hover && active !== null ? (
                  <>
                    <span className="font-semibold text-ink">
                      {WEEKDAYS[hover.weekday]} {hourLabel(hover.hour)}
                    </span>{" "}
                    · <span className="num">{active.toFixed(1)}</span> entries on average
                  </>
                ) : heat.peak ? (
                  <>
                    Busiest: <span className="font-semibold text-ink">{WEEKDAYS[heat.peak.weekday]}s at {hourLabel(heat.peak.hour)}</span>, with{" "}
                    <span className="num font-semibold text-ink">{heat.peak.average.toFixed(1)}</span> entries on average.
                  </>
                ) : (
                  "Hover a square for the numbers."
                )}
              </p>
              <div className="overflow-x-auto" ref={heatRef}>
                <div className="min-w-[34rem]" onPointerLeave={() => setHover(null)} role="img" aria-label={`Average entries by weekday and hour, ${month.label}`}>
                  {WEEK_ORDER.map((w) => (
                    <div key={w} className="flex items-center gap-1 py-[2px]">
                      <span className="w-10 shrink-0 text-xs text-ink-muted">{WEEKDAYS[w].slice(0, 3)}</span>
                      {HOURS.map((h) => {
                        const v = heat.grid[w][h];
                        const share = heat.max ? v / heat.max : 0;
                        return (
                          <span
                            key={h}
                            data-cell
                            onPointerEnter={() => setHover({ weekday: w, hour: h })}
                            className="h-6 flex-1 rounded-[4px] border border-line"
                            style={{ background: v > 0 ? `rgba(245, 179, 1, ${(0.1 + share * 0.85).toFixed(2)})` : "transparent" }}
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex gap-1 pt-1.5">
                    <span className="w-10 shrink-0" />
                    {HOURS.map((h) => (
                      <span key={h} className="flex-1 text-center text-[0.625rem] text-ink-faint">
                        {(h - FIRST_HOUR) % 3 === 0 ? hourLabel(h).replace(" ", "") : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="sr-only">
              <table>
                <caption>Average entries per hour by weekday, {month.label}</caption>
                <thead>
                  <tr>
                    <th>Weekday</th>
                    {HOURS.map((h) => (
                      <th key={h}>{hourLabel(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEK_ORDER.map((w) => (
                    <tr key={w}>
                      <th>{WEEKDAYS[w]}</th>
                      {HOURS.map((h) => (
                        <td key={h}>{heat.grid[w][h].toFixed(1)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </Panel>

          <div data-enter className="grid gap-5 xl:grid-cols-2 xl:gap-6">
            <Panel aria-labelledby="decks-title" className="min-w-0">
              <PanelHeader id="decks-title" title="Decks" />
              <div className="overflow-x-auto border-t border-line">
                <table className="c-table">
                  <caption className="sr-only">Entries, average stay and bay turnover per deck, {month.label}</caption>
                  <thead>
                    <tr>
                      <th>Deck</th>
                      <th>Entries</th>
                      <th>Avg stay</th>
                      <th>Bay turnover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...decks].reverse().map((d) => (
                      <tr key={d.floor}>
                        <td className="font-semibold text-ink">Level {d.floor}</td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="num w-9 text-right">{d.entries}</span>
                            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
                              <span className="block h-full rounded-full bg-gold" style={{ width: `${(d.entries / maxEntries) * 100}%` }} />
                            </span>
                          </div>
                        </td>
                        <td className="num">{formatStay(d.avgStayMin)}</td>
                        <td className="num">{d.turnover.toFixed(2)} / day</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-ink-faint sm:px-5">
                Bay turnover is how many times each bay is used on an average day. Average stay only counts cars that have left.
              </p>
            </Panel>

            <Panel aria-labelledby="hourly-title" className="min-w-0">
              <PanelHeader id="hourly-title" title="Entries per hour" />
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="flex h-40 items-end gap-1" role="img" aria-label={`Average entries per hour of the day, ${month.label}`}>
                  {HOURS.map((h) => (
                    <div key={h} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${hourLabel(h)}: ${hourly[h].toFixed(1)} entries on average`}>
                      <div data-bar className="w-full rounded-t-[3px] bg-gold" style={{ height: `${maxHourly ? Math.max(2, (hourly[h] / maxHourly) * 100) : 0}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-1">
                  {HOURS.map((h) => (
                    <span key={h} className="flex-1 text-center text-[0.625rem] text-ink-faint">
                      {(h - FIRST_HOUR) % 3 === 0 ? hourLabel(h).replace(" ", "") : ""}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-faint">All gates combined. The split by gate is below.</p>
              </div>
            </Panel>

            <Panel aria-labelledby="gates-title" className="min-w-0 xl:col-span-2">
              <PanelHeader id="gates-title" title="Throughput by gate" />
              {gate.gates.length === 0 ? (
                <p className="border-t border-line px-4 py-4 text-sm text-ink-muted sm:px-5">No gate was recorded for the taps this month.</p>
              ) : (
                <ul className="border-t border-line">
                  {gate.gates.map((g) => {
                    const total = gate.gates.reduce((a, x) => a + x.entries + x.exits, 0);
                    const share = total ? Math.round(((g.entries + g.exits) / total) * 100) : 0;
                    return (
                      <li key={g.gate} className="border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="font-semibold text-ink">{g.gate}</p>
                          <p className="num text-sm text-ink-muted">
                            {g.entries} in · {g.exits} out · {share}% of taps
                          </p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                          <div className="h-full rounded-full bg-gold" style={{ width: `${share}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-ink-faint">
                          {g.peakHour === null ? "No entries yet." : `Busiest at ${hourLabel(g.peakHour)}, ${g.peakAverage.toFixed(1)} entries on average.`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              {gate.unassigned > 0 && (
                <p className="border-t border-line px-4 py-3 text-xs text-ink-faint sm:px-5">{gate.unassigned} older taps have no gate recorded and are not counted here.</p>
              )}
            </Panel>
          </div>
        </>
      )}

      <Panel data-enter aria-labelledby="viol-title">
        <PanelHeader
          id="viol-title"
          title="Violations by week"
          aside={
            <ul className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-muted sm:flex" aria-label="Legend">
              {(Object.keys(VIOLATION) as ViolationType[]).map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span aria-hidden className={`size-2.5 rounded-[3px] ${VIOLATION[t].swatch}`} />
                  {VIOLATION[t].label}
                </li>
              ))}
            </ul>
          }
        />
        {maxWeek === 0 ? (
          <div className="border-t border-line">
            <EmptyState title="No violations in the last 8 weeks">
              Overstays, overnight parking and repeat entries show up here once the gate flags them. For now they are stored in this browser.
            </EmptyState>
          </div>
        ) : (
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="flex h-40 items-end gap-2 sm:gap-3" role="img" aria-label="Violations per week, by type, last 8 weeks">
              {weeks.map((w) => (
                <div key={w.start} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`Week of ${w.label}: ${w.total} violation${w.total === 1 ? "" : "s"}`}>
                  <span className="num mb-1 text-center text-xs text-ink-muted">{w.total || ""}</span>
                  <div data-bar className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px]" style={{ height: `${(w.total / maxWeek) * 82}%` }}>
                    {(Object.keys(VIOLATION) as ViolationType[]).map((t) => (
                      <div key={t} className={VIOLATION[t].swatch} style={{ height: `${w.total ? (w.counts[t] / w.total) * 100 : 0}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2 sm:gap-3">
              {weeks.map((w) => (
                <span key={w.start} className="flex-1 truncate text-center text-[0.625rem] text-ink-faint">
                  {w.label}
                </span>
              ))}
            </div>
            <div className="sr-only">
            <table>
              <caption>Violations per week by type</caption>
              <thead>
                <tr>
                  <th>Week starting</th>
                  <th>Overstay</th>
                  <th>Overnight</th>
                  <th>Second entry without exit</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.start}>
                    <td>{w.label}</td>
                    <td>{w.counts.overstay}</td>
                    <td>{w.counts.overnight}</td>
                    <td>{w.counts["anti-passback"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Panel>

      {sample && <p className="text-xs text-ink-faint">Sample history, not real gate traffic.</p>}
    </div>
  );
}
