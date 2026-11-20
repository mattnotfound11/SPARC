"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeekBucket } from "@/lib/analytics/analytics";
import type { ViolationType } from "@/lib/portal/types";
import { COLORS, TipCard, VIOLATION, tickStyle } from "./chartTheme";

const TYPES = Object.keys(VIOLATION) as ViolationType[];

/** Violations per week, stacked by type. A 2px gap in the surface colour separates the segments. */
export function ViolationBars({ weeks }: { weeks: WeekBucket[] }) {
  const data = weeks.map((w) => ({ label: w.label, total: w.total, ...w.counts }));
  return (
    <div>
      <div className="h-56" role="img" aria-label="Violations per week, by type, last 8 weeks">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
            <YAxis tick={tickStyle} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload, label }) => {
                const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
                return active && row ? (
                  <TipCard
                    title={`Week of ${label}`}
                    rows={[
                      ...TYPES.filter((t) => row[t] > 0).map((t) => ({ label: VIOLATION[t].label, value: String(row[t]), color: VIOLATION[t].color })),
                      { label: "Total", value: String(row.total) },
                    ]}
                  />
                ) : null;
              }}
            />
            {TYPES.map((t, i) => (
              <Bar
                key={t}
                dataKey={t}
                stackId="v"
                fill={VIOLATION[t].color}
                stroke={COLORS.surface}
                strokeWidth={2}
                barSize={24}
                radius={i === TYPES.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="sr-only">
        <table>
          <caption>Violations per week by type</caption>
          <thead>
            <tr>
              <th>Week starting</th>
              {TYPES.map((t) => (
                <th key={t}>{VIOLATION[t].label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.start}>
                <td>{w.label}</td>
                {TYPES.map((t) => (
                  <td key={t}>{w.counts[t]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
