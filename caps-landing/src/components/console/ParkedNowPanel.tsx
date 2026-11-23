"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNow, useSparcState } from "@/lib/sparc/SparcProvider";
import { formatDuration, formatTime } from "@/lib/sparc/selectors";
import { Badge, EmptyState, Panel, PanelHeader } from "./ui";
import { ROLE_LABEL } from "./UserPanel";

/**
 * Who is parked in the building right now: one row per occupied bay, longest stay first. Staff only
 * (the console), since it shows names and card numbers.
 */
export function ParkedNowPanel({ limit }: { limit?: number } = {}) {
  const state = useSparcState();
  const now = useNow(30000);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const roles = new Map(state.users.map((u) => [u.id, u.role]));
    return state.slots
      .filter((s) => s.status === "occupied" && s.occupant)
      .map((s) => {
        const o = s.occupant!;
        const role = roles.get(o.userId);
        return {
          code: s.code,
          floor: s.floor,
          name: o.name,
          card: o.nfcId,
          since: o.since,
          label: role ? ROLE_LABEL[role] : "Walk-in",
        };
      })
      // With a limit (the dashboard) show the newest arrivals; the full page lists longest stay first.
      .sort((a, b) => (limit ? b.since - a.since : a.since - b.since));
  }, [state.slots, state.users, limit]);

  const q = query.trim().toLowerCase();
  const matched = q
    ? rows.filter((r) => [r.name, r.card, r.label].some((v) => v.toLowerCase().includes(q)))
    : rows;
  const shown = limit ? matched.slice(0, limit) : matched;

  return (
    <Panel aria-labelledby="parked-title">
      <PanelHeader
        id="parked-title"
        title="Parked now"
        aside={<span className="text-sm text-ink-muted">{rows.length} {rows.length === 1 ? "vehicle" : "vehicles"} inside</span>}
      />
      {rows.length === 0 ? (
        <EmptyState title="Nobody is parked inside">Drivers appear here after they tap in at the gate.</EmptyState>
      ) : (
        <>
          <div className="px-4 pb-3 sm:px-5">
            <label htmlFor="parked-search" className="sr-only">Search who is parked</label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                id="parked-search"
                type="search"
                className="c-input min-h-11 w-full pl-9"
                placeholder="Search name, role or card"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="px-4 pb-6 text-sm text-ink-muted sm:px-5">No one parked matches &ldquo;{query}&rdquo;.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-ink-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium sm:px-5">Driver</th>
                    <th className="px-2 py-2 font-medium">In since</th>
                    <th className="px-4 py-2 font-medium sm:px-5">Card</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.code} className="border-t border-line">
                      <td className="px-4 py-2.5 sm:px-5">
                        <p className="font-medium text-ink">{r.name}</p>
                        <Badge className="mt-1">{r.label}</Badge>
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="num text-ink">{formatTime(r.since)}</p>
                        <p className="text-xs text-ink-muted">{formatDuration((now - r.since) / 60000)}</p>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs break-all text-ink-muted sm:px-5">{r.card}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
