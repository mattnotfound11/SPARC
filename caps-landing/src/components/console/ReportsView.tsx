"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileDown } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { downloadCsv } from "@/lib/sparc/csv";
import { useSparcState } from "@/lib/sparc/SparcProvider";
import { dayRanges, dayReport, formatClock, totalCapacity } from "@/lib/sparc/selectors";
import { FlowChart, OccupancyChart } from "./HourlyCharts";
import { PageHeader, Panel, PanelHeader, useToast } from "./ui";

export function ReportsView() {
  const root = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  const toast = useToast();
  const [dayIndex, setDayIndex] = useState(0);
  useEnter(root);

  const days = useMemo(() => dayRanges(state.now), [state.now]);
  const reports = useMemo(() => days.map((d) => dayReport(state, d)), [state, days]);
  const report = reports[dayIndex];
  const capacity = totalCapacity(state.config);

  const summary = [
    { label: "Entries", value: String(report.entries) },
    { label: "Exits", value: String(report.exits) },
    { label: "Peak occupancy", value: String(report.peakOccupancy), note: report.peakHour !== null ? `at ${formatClock(report.peakHour)}` : undefined },
  ];

  function exportDay() {
    downloadCsv(`sparc-daily-report-${report.range.key}.csv`, [
      ["SPARC daily usage report", report.range.label, report.range.key],
      [],
      ["Entries", report.entries],
      ["Exits", report.exits],
      ["Peak occupancy", report.peakOccupancy, report.peakHour !== null ? formatClock(report.peakHour) : ""],
      [],
      ["Hour", "Entries", "Exits", "Vehicles inside at end of hour"],
      ...report.hourly.filter((p) => p.occupancy !== null).map((p) => [formatClock(p.hour), p.entries, p.exits, p.occupancy]),
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
              Export this day
            </button>
          </>
        }
      />

      <div data-enter className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="seg" role="tablist" aria-label="Report day">
          {days.map((d, i) => (
            <button key={d.key} type="button" role="tab" aria-selected={dayIndex === i} onClick={() => setDayIndex(i)}>
              {d.label}
            </button>
          ))}
        </div>
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
              {reports.map((r, i) => (
                <tr key={r.range.key} className={i === dayIndex ? "bg-gold/[0.05]" : ""}>
                  <td>
                    <button type="button" onClick={() => setDayIndex(i)} aria-current={i === dayIndex ? "true" : undefined} className="rounded-md font-semibold text-ink underline-offset-4 hover:text-gold hover:underline">
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
