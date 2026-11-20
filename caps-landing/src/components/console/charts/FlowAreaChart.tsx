"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayFlow } from "@/lib/analytics/analytics";
import { COLORS, TipCard, tickStyle } from "./chartTheme";

/** Entries and exits for each day of the month: entries as a gold area, exits as a blue line. */
export function FlowAreaChart({ daily, monthLabel }: { daily: DayFlow[]; monthLabel: string }) {
  const monthName = monthLabel.split(" ")[0];
  const data = daily.map((d) => ({ label: d.label, entries: d.entries, exits: d.exits }));
  return (
    <div>
      <div className="h-56" role="img" aria-label={`Entries and exits per day, ${monthLabel}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="flow-entries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.entries} stopOpacity={0.22} />
                <stop offset="100%" stopColor={COLORS.entries} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={{ stroke: COLORS.grid }} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tick={tickStyle} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip
              cursor={{ stroke: COLORS.cursor, strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TipCard
                    title={`${monthName} ${label}`}
                    rows={[
                      { label: "Entries", value: String(payload.find((p) => p.dataKey === "entries")?.value ?? 0), color: COLORS.entries },
                      { label: "Exits", value: String(payload.find((p) => p.dataKey === "exits")?.value ?? 0), color: COLORS.exits },
                    ]}
                  />
                ) : null
              }
            />
            <Area type="monotone" dataKey="entries" stroke={COLORS.entries} strokeWidth={2} fill="url(#flow-entries)" activeDot={{ r: 4.5, fill: COLORS.entries, stroke: COLORS.surface, strokeWidth: 2 }} dot={false} />
            <Area type="monotone" dataKey="exits" stroke={COLORS.exits} strokeWidth={2} fill="none" activeDot={{ r: 4.5, fill: COLORS.exits, stroke: COLORS.surface, strokeWidth: 2 }} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="sr-only">
        <table>
          <caption>Entries and exits per day, {monthLabel}</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Entries</th>
              <th>Exits</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.start}>
                <td>{d.label}</td>
                <td>{d.entries}</td>
                <td>{d.exits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
