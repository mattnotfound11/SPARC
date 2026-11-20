"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Download, Printer } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import {
  WEEKDAYS,
  dailyFlow,
  hourLabel,
  hourlyEntries,
  hourlyFlow,
  logsIn,
  monthChange,
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
import { COLORS, Legend, VIOLATION } from "./charts/chartTheme";
import { FlowAreaChart } from "./charts/FlowAreaChart";
import { HeatmapChart } from "./charts/HeatmapChart";
import { HourlyChart } from "./charts/HourlyChart";
import { Sparkline } from "./charts/Sparkline";
import { ViolationBars } from "./charts/ViolationBars";
import { EmptyState, PageHeader, Panel, PanelHeader, useToast } from "./ui";

const FLOW_LEGEND = [
  { label: "Entries", color: COLORS.entries },
  { label: "Exits", color: COLORS.exits },
];

function Change({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  const up = percent >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
      <Icon className="size-3.5" aria-hidden />
      <span className="num font-semibold text-ink-soft">{Math.abs(Math.round(percent))}%</span> {up ? "more" : "fewer"} a day than last month
    </p>
  );
}

export function ReportsView() {
  const root = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  const portal = usePortalState();
  const toast = useToast();
  const [pick, setPick] = useState<boolean | null>(null);
  // The demo account turns the sample history on by itself, until real gate traffic exists
  const sample = pick ?? (portal.demo === true && state.logs.length === 0);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  useEnter(root);

  const now = state.now;
  const options = useMemo(() => months(now, 6), [now]);
  const monthIndex = Math.max(0, options.findIndex((m) => m.key === monthKey));
  const month = options[monthIndex];

  const logs = useMemo(() => (sample ? sampleHistory(state.config, now, 60) : state.logs), [sample, state.config, state.logs, now]);
  const inMonth = useMemo(() => logsIn(logs, month), [logs, month]);
  const entries = useMemo(() => inMonth.filter((l) => l.event === "entry").length, [inMonth]);
  const exits = useMemo(() => inMonth.filter((l) => l.event === "exit").length, [inMonth]);
  const heat = useMemo(() => weekdayHour(logs, month, now), [logs, month, now]);
  const hourly = useMemo(() => hourlyEntries(logs, month, now), [logs, month, now]);
  const flow = useMemo(() => hourlyFlow(logs, month, now), [logs, month, now]);
  const daily = useMemo(() => dailyFlow(logs, month, now), [logs, month, now]);
  const change = useMemo(() => monthChange(logs, options, monthIndex, now), [logs, options, monthIndex, now]);
  // A dismissed violation was cancelled, so it doesn't count toward the trend
  const standing = useMemo(() => portal.violations.filter((v) => v.status !== "dismissed"), [portal.violations]);
  const weeks = useMemo(() => violationWeeks(standing, now, 8), [standing, now]);
  const monthViolations = standing.filter((v) => v.at >= month.start && v.at < month.end).length;
  const maxWeek = Math.max(0, ...weeks.map((w) => w.total));
  const empty = entries === 0;

  function exportCsv() {
    downloadCsv(`sparc-monthly-report-${month.key}.csv`, monthlyRows({ month, heat, hourly, violations: weeks, entries, daily }));
    toast(`Exported the report for ${month.label}.`);
  }

  const summary = [
    { label: "Entries", value: String(entries), trend: daily.map((d) => d.entries), color: COLORS.entries, extra: <Change percent={change} /> },
    { label: "Exits", value: String(exits), trend: daily.map((d) => d.exits), color: COLORS.exits },
    {
      label: "Busiest time",
      value: heat.peak ? `${WEEKDAYS[heat.peak.weekday].slice(0, 3)} ${hourLabel(heat.peak.hour)}` : "n/a",
      note: heat.peak ? `${heat.peak.average.toFixed(1)} entries on average` : undefined,
    },
    { label: "Violations", value: String(monthViolations), trend: weeks.map((w) => w.total), color: VIOLATION.overnight.color },
  ];

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Reports"
        description={`When the building is busy and how often rules are broken. ${month.label}.`}
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
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-line">
              {summary.map(({ label, value, note, trend, color, extra }, i) => (
                <div key={label} className={`flex min-w-0 flex-col ${i > 0 ? "lg:pl-6" : ""}`}>
                  <dt className="text-sm text-ink-muted">{label}</dt>
                  <dd className="num mt-1 font-display text-[1.75rem] leading-none font-semibold tracking-tight text-ink">{value}</dd>
                  {note && <p className="mt-1 text-xs text-ink-muted">{note}</p>}
                  {extra}
                  {trend && color && (
                    <div className="mt-2">
                      <Sparkline values={trend} color={color} />
                    </div>
                  )}
                </div>
              ))}
            </dl>
          </Panel>

          <Panel data-enter aria-labelledby="daily-title">
            <PanelHeader id="daily-title" title="Entries and exits per day" aside={<Legend items={FLOW_LEGEND} />} />
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <FlowAreaChart daily={daily} monthLabel={month.label} />
            </div>
          </Panel>

          <Panel data-enter aria-labelledby="hourly-title">
            <PanelHeader id="hourly-title" title="Entries per hour" />
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <HourlyChart flow={flow} monthLabel={month.label} />
            </div>
          </Panel>

          <Panel data-enter aria-labelledby="heat-title">
            <PanelHeader id="heat-title" title="Busiest times" />
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <HeatmapChart heat={heat} monthLabel={month.label} />
            </div>
          </Panel>
        </>
      )}

      <Panel data-enter aria-labelledby="viol-title">
        <PanelHeader
          id="viol-title"
          title="Violations by week"
          aside={
            <div className="hidden sm:block">
              <Legend items={(Object.keys(VIOLATION) as ViolationType[]).map((t) => VIOLATION[t])} />
            </div>
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
            <ViolationBars weeks={weeks} />
          </div>
        )}
      </Panel>

      {sample && <p className="text-xs text-ink-faint">Sample history, not real gate traffic.</p>}
    </div>
  );
}
