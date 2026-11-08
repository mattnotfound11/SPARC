"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftFromLine, ArrowRightToLine, Download, Search, ShieldAlert } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { downloadCsv } from "@/lib/sparc/csv";
import { useNow, useSparcState } from "@/lib/sparc/SparcProvider";
import { VEHICLE_LABEL, dayRanges, formatDateTime, matchesLog, timeAgo } from "@/lib/sparc/selectors";
import type { LogEntry, LogEvent } from "@/lib/sparc/types";
import { Badge, EmptyState, PageHeader, Panel, useToast } from "./ui";

const STEP = 25;
const EVENTS: { value: LogEvent | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "entry", label: "Entries" },
  { value: "exit", label: "Exits" },
  { value: "denied", label: "Denied" },
];

function EventBadge({ l }: { l: LogEntry }) {
  if (l.event === "entry")
    return (
      <Badge tone="live">
        <ArrowRightToLine className="size-3" aria-hidden />
        Entry
      </Badge>
    );
  if (l.event === "exit")
    return (
      <Badge>
        <ArrowLeftFromLine className="size-3" aria-hidden />
        Exit
      </Badge>
    );
  return (
    <Badge tone="crimson">
      <ShieldAlert className="size-3" aria-hidden />
      Denied
    </Badge>
  );
}

export function LogsView() {
  const root = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  const toast = useToast();
  const now = useNow(30000);
  useEnter(root);

  const days = useMemo(() => dayRanges(state.now), [state.now]);
  const [event, setEvent] = useState<LogEvent | "all">("all");
  const [dayKey, setDayKey] = useState<string>("week");
  const [floor, setFloor] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(STEP);

  const rows = useMemo(() => {
    const range = dayKey === "week" ? null : days.find((d) => d.key === dayKey);
    return state.logs.filter(
      (l) =>
        (event === "all" || l.event === event) &&
        (!range || (l.at >= range.start && l.at < range.end)) &&
        (floor === "all" || l.floor === floor) &&
        matchesLog(l, query.trim()),
    );
  }, [state.logs, days, event, dayKey, floor, query]);

  const visible = rows.slice(0, shown);
  const filtered = event !== "all" || dayKey !== "week" || floor !== "all" || query !== "";
  const reset = () => {
    setEvent("all");
    setDayKey("week");
    setFloor("all");
    setQuery("");
    setShown(STEP);
  };

  function exportRows() {
    downloadCsv(`sparc-entry-exit-log-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Time", "Event", "Driver", "Card ID", "Slot", "Floor", "Vehicle", "Result", "Reason"],
      ...rows.map((l) => [
        new Date(l.at).toISOString(),
        l.event,
        l.userName ?? "Unregistered",
        l.nfcId,
        l.slot,
        l.floor,
        l.vehicle ? VEHICLE_LABEL[l.vehicle] : "",
        l.result,
        l.reason ?? "",
      ]),
    ]);
    toast(`Exported ${rows.length} log rows.`);
  }

  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setShown(STEP);
  };

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Entry and exit log"
        description="Every tap at the gate: who entered, which slot they took, when they left, and every card that was turned away."
        actions={
          <button type="button" className="c-btn" onClick={exportRows} disabled={rows.length === 0}>
            <Download className="size-4" aria-hidden />
            Export CSV
          </button>
        }
      />

      <Panel data-enter aria-label="Gate log">
        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="seg" role="group" aria-label="Event type">
              {EVENTS.map((e) => (
                <button key={e.value} type="button" aria-pressed={event === e.value} onClick={() => change(setEvent)(e.value)}>
                  {e.label}
                </button>
              ))}
            </div>
            <label htmlFor="log-day" className="sr-only">
              Day
            </label>
            <select id="log-day" className="c-input" value={dayKey} onChange={(e) => change(setDayKey)(e.target.value)}>
              <option value="week">Last 7 days</option>
              {days.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
            <label htmlFor="log-floor" className="sr-only">
              Floor
            </label>
            <select
              id="log-floor"
              className="c-input"
              value={floor}
              onChange={(e) => change(setFloor)(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">All floors</option>
              {state.config.map((f) => (
                <option key={f.floor} value={f.floor}>
                  Floor {f.floor}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <label htmlFor="log-search" className="sr-only">
              Search the log
            </label>
            <input
              id="log-search"
              type="search"
              value={query}
              onChange={(e) => change(setQuery)(e.target.value)}
              placeholder="Search name, card ID or slot code"
              className="c-input w-full pl-9"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState
              title={filtered ? "Nothing matches these filters" : "No gate activity yet"}
              action={
                filtered ? (
                  <button type="button" className="c-btn" onClick={reset}>
                    Clear filters
                  </button>
                ) : undefined
              }
            >
              {filtered ? "Widen the day range or clear the search." : "Taps will be listed here as drivers use the gate."}
            </EmptyState>
          </div>
        ) : (
          <>
            {/* Phone */}
            <ul className="border-t border-line md:hidden">
              {visible.map((l) => (
                <li key={l.id} className="space-y-1 border-b border-line px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <EventBadge l={l} />
                    <p className="num text-xs text-ink-muted">{formatDateTime(l.at)}</p>
                  </div>
                  <p className="font-semibold text-ink">{l.userName ?? "Unregistered card"}</p>
                  <p className="text-sm text-ink-muted">
                    <span className="font-mono">{l.nfcId}</span>
                    {l.slot && (
                      <>
                        {" · Slot "}
                        <span className="font-mono">{l.slot}</span>
                      </>
                    )}
                    {l.reason && ` · ${l.reason}`}
                  </p>
                </li>
              ))}
            </ul>

            {/* Tablet and up */}
            <div className="hidden overflow-x-auto border-t border-line md:block">
              <table className="c-table">
                <caption className="sr-only">Entry and exit log</caption>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Driver</th>
                    <th>Card ID</th>
                    <th>Slot</th>
                    <th>Vehicle</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap">
                        <p className="num text-ink">{formatDateTime(l.at)}</p>
                        <p className="text-xs text-ink-muted">{timeAgo(l.at, now)}</p>
                      </td>
                      <td>
                        <EventBadge l={l} />
                      </td>
                      <td className="font-semibold text-ink">
                        {l.userName ?? <span className="font-normal text-ink-muted">Unregistered card</span>}
                      </td>
                      <td className="font-mono text-[0.8125rem]">
                        {l.event === "denied" && !l.userId ? (
                          <Link href={`/admin/users?nfc=${encodeURIComponent(l.nfcId)}`} className="underline underline-offset-4 transition-colors hover:text-gold" title="Register this card">
                            {l.nfcId}
                          </Link>
                        ) : (
                          l.nfcId
                        )}
                      </td>
                      <td className="font-mono text-[0.8125rem]">{l.slot ?? "—"}</td>
                      <td>{l.vehicle ? VEHICLE_LABEL[l.vehicle] : "—"}</td>
                      <td>{l.result === "granted" ? <Badge tone="live">Granted</Badge> : <Badge tone="crimson">{l.reason ?? "Denied"}</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-muted">
              <p className="num" aria-live="polite">
                Showing {visible.length} of {rows.length}
              </p>
              {visible.length < rows.length && (
                <button type="button" className="c-btn c-btn-sm" onClick={() => setShown((n) => n + STEP)}>
                  Show {Math.min(STEP, rows.length - visible.length)} more
                </button>
              )}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
