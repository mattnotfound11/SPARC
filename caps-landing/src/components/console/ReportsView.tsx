"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Download, FileDown } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { downloadCsv } from "@/lib/sparc/csv";
import { useSparcState } from "@/lib/sparc/SparcProvider";
import { combineReports, dayRangeFor, dayRanges, dayReport, formatClock, parseDateKey, totalCapacity, type DayReport } from "@/lib/sparc/selectors";
import { FlowChart, OccupancyChart } from "./HourlyCharts";
import { PageHeader, Panel, PanelHeader, useToast } from "./ui";

export function ReportsView() {
  const root = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  const toast = useToast();
  // "today" | "yesterday" | "week" | a "YYYY-MM-DD" date picked from the calendar
  const [view, setView] = useState("today");
  useEnter(root);

  const days = useMemo(() => dayRanges(state.now), [state.now]);
  const reports = useMemo(() => days.map((d) => dayReport(state, d)), [state, days]);
  const week = useMemo(() => combineReports(reports, "Last week"), [reports]);
  const picked = view === "today" || view === "yesterday" || view === "week" ? null : view;
  const report: DayReport = useMemo(() => {
    if (view === "today") return reports[0];
    if (view === "yesterday") return reports[1];
    if (view === "week") return week;
    const known = reports.find((r) => r.range.key === view);
    const date = parseDateKey(view);
    return known ?? (date ? dayReport(state, dayRangeFor(date, state.now)) : reports[0]);
  }, [view, reports, week, state]);
  // the days covered, oldest first (for the CSV)
  const covered = view === "week" ? [...reports].reverse() : [report];
  const capacity = totalCapacity(state.config);

  function selectDay(key: string) {
    setView(key === days[0].key ? "today" : key === days[1].key ? "yesterday" : key);
  }

  const summary = [
    { label: "Entries", value: String(report.entries) },
    { label: "Exits", value: String(report.exits) },
    { label: "Peak occupancy", value: String(report.peakOccupancy), note:
        report.peakHour === null
          ? undefined
          : view === "week" && week.peakDay
            ? `${week.peakDay.label} at ${formatClock(report.peakHour)}`
            : `at ${formatClock(report.peakHour)}`,
    },
  ];

  function exportDay() {
    const name = view === "week" ? `sparc-report-${covered[0].range.key}-to-${covered[covered.length - 1].range.key}` : `sparc-daily-report-${report.range.key}`;
    downloadCsv(`${name}.csv`, [
      ["Date", "Hour", "Entries", "Exits", "Vehicles inside at end of hour"],
      ...covered.flatMap((r) =>
        r.hourly
          .filter((p) => p.occupancy !== null)
          .map((p) => [r.range.key, `${String(p.hour).padStart(2, "0")}:00`, p.entries, p.exits, p.occupancy]),
      ),
    ]);
    toast(`Exported the report for ${report.range.label}.`);
  }

  function exportWeek() {
    downloadCsv(`sparc-7-day-summary-${days[0].key}.csv`, [
      ["Date", "Entries", "Exits", "Peak occupancy", "Peak hour"],
      ...reports.map((r) => [
        r.range.key,
        r.entries,
        r.exits,
        r.peakOccupancy,
        r.peakHour !== null ? formatClock(r.peakHour) : "",
      ]),
    ]);
    toast("Exported the 7-day summary.");
  }

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Daily usage report"
        description="How busy the building was, hour by hour. Built from the entry and exit log."
        actions={
          <>
            <button type="button" className="c-btn" onClick={exportWeek}>
              <FileDown className="size-4" aria-hidden />
              7-day summary
            </button>
            <button type="button" className="c-btn c-btn-gold" onClick={exportDay}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </button>
          </>
        }
      />

      <div data-enter className="flex flex-wrap items-center gap-2.5">
        <div className="seg" role="tablist" aria-label="Report period">
          {(
            [
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["week", "Last week"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
        <label
          className={`flex h-[2.375rem] cursor-pointer items-center gap-2 rounded-xl border px-3 text-[0.8125rem] font-semibold transition-colors ${
            picked ? "border-gold/60 bg-gold/[0.1] text-ink" : "border-line bg-field text-ink-muted hover:text-ink"
          }`}
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Pick a date</span>
          <input
            type="date"
            value={picked ?? ""}
            max={days[0].key}
            onChange={(e) => (e.target.value ? selectDay(e.target.value) : setView("today"))}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className="bg-transparent text-inherit [color-scheme:dark] outline-none [&::-webkit-calendar-picker-indicator]:hidden"
            aria-label="Pick a date to see its report"
          />
        </label>
      </div>

      <Panel data-enter aria-label={`Summary for ${report.range.label}`} className="p-4 sm:p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-y-0 lg:divide-x lg:divide-line">
          {summary.map(({ label, value, note }, i) => (
            <div key={label} className={i > 0 ? "lg:pl-6" : ""}>
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="mt-1 font-display text-[1.75rem] leading-none font-semibold tracking-tight text-ink num">{value}</dd>
              {note && <p className="mt-1 text-xs text-ink-muted">{note}</p>}
            </div>
          ))}
        </dl>
      </Panel>

      <div data-enter className="grid gap-5 xl:grid-cols-2 xl:gap-6">
        <Panel aria-labelledby="occ-title">
          <PanelHeader id="occ-title" title="Vehicles inside" />
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <OccupancyChart report={report} capacity={capacity} />
          </div>
        </Panel>
        <Panel aria-labelledby="flow-title">
          <PanelHeader id="flow-title" title="Entries and exits per hour" />
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <FlowChart report={report} />
          </div>
        </Panel>
      </div>

      <Panel data-enter aria-labelledby="week-title">
        <PanelHeader id="week-title" title="Last 7 days" />
        <div className="overflow-x-auto border-t border-line">
          <table className="c-table">
            <caption className="sr-only">Daily totals for the last seven days</caption>
            <thead>
              <tr>
                <th>Day</th>
                <th>Entries</th>
                <th>Peak</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.range.key} className={report.range.key === r.range.key ? "bg-gold/[0.05]" : ""}>
                  <td>
                    <button type="button" onClick={() => selectDay(r.range.key)} aria-current={report.range.key === r.range.key ? "true" : undefined} className="rounded-md font-semibold text-ink underline-offset-4 hover:text-gold hover:underline">
                      {r.range.label}
                    </button>
                  </td>
                  <td className="num">{r.entries}</td>
                  <td className="num">
                    {r.peakOccupancy}
                    {r.peakHour !== null && <span className="text-ink-muted"> · {formatClock(r.peakHour)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
