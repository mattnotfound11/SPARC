"use client";

import { useMemo, useRef } from "react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { useNow, useSparcState } from "@/lib/sparc/SparcProvider";
import { formatDuration, formatTime, timeAgo } from "@/lib/sparc/selectors";
import { ParkedNowPanel } from "./ParkedNowPanel";
import { EmptyState, PageHeader, Panel, PanelHeader } from "./ui";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Drivers who tapped out in the last 24 hours, newest first, with how long they stayed. */
function LeftRecentlyPanel() {
  const state = useSparcState();
  const now = useNow(30000);

  const rows = useMemo(() => {
    const entries = new Map<string, number>();
    for (const l of state.logs) if (l.event === "entry" && l.visitId) entries.set(l.visitId, l.at);
    return state.logs
      .filter((l) => l.event === "exit" && now - l.at <= DAY_MS)
      .map((l) => {
        const entryAt = l.visitId ? entries.get(l.visitId) : undefined;
        return {
          id: l.id,
          name: l.userName ?? "Unknown card",
          at: l.at,
          stayed: entryAt !== undefined ? (l.at - entryAt) / 60000 : null,
          where: l.floor && l.slot ? `Level ${l.floor} · ${l.slot}` : "—",
        };
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 50);
  }, [state.logs, now]);

  return (
    <Panel aria-labelledby="left-title">
      <PanelHeader
        id="left-title"
        title="Left in the last 24 hours"
        aside={<span className="text-sm text-ink-muted">{rows.length} {rows.length === 1 ? "exit" : "exits"}</span>}
      />
      {rows.length === 0 ? (
        <EmptyState title="No exits yet">People appear here after they tap out at the gate.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm md:table-fixed">
            <colgroup className="hidden md:table-column-group"><col className="w-[40%]" /><col className="w-[30%]" /><col className="w-[15%]" /><col className="w-[15%]" /></colgroup>
            <thead className="text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium sm:px-5">Driver</th>
                <th className="px-2 py-2 font-medium">Left</th>
                <th className="px-2 py-2 font-medium">Stayed</th>
                <th className="px-4 py-2 font-medium sm:px-5">Was at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-medium text-ink sm:px-5">{r.name}</td>
                  <td className="px-2 py-2.5">
                    <p className="num text-ink">{formatTime(r.at)}</p>
                    <p className="text-xs text-ink-muted">{timeAgo(r.at, now)}</p>
                  </td>
                  <td className="num px-2 py-2.5 text-ink">{formatDuration(r.stayed)}</td>
                  <td className="num px-4 py-2.5 text-ink-muted sm:px-5">{r.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/** Live view of who is inside the building and who has just left, for tracking whether someone is still parked. */
export function InsideView() {
  const root = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  useEnter(root);
  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Inside now"
        description="Everyone parked in the building right now. A driver leaves this list when they tap out at the gate."
        actions={
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <span className="dot-pulse size-1.5 rounded-full bg-live" aria-hidden />
            Live · updated {formatTime(state.now)}
          </p>
        }
      />
      <div data-enter>
        <ParkedNowPanel />
      </div>
      <div data-enter>
        <LeftRecentlyPanel />
      </div>
    </div>
  );
}
