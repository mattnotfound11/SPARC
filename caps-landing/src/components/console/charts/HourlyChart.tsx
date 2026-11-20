"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { hourLabel, type HourFlow } from "@/lib/analytics/analytics";
import { COLORS, TipCard, tickStyle } from "./chartTheme";

const FIRST_HOUR = 5;
const LAST_HOUR = 22;

/** Average entries per hour of the day as bars, with the busiest hour lit. */
export function HourlyChart({ flow, monthLabel }: { flow: HourFlow[]; monthLabel: string }) {
  const hours = flow.filter((h) => h.hour >= FIRST_HOUR && h.hour <= LAST_HOUR);
  const peak = hours.reduce((best, h) => (h.entries > best.entries ? h : best), hours[0] ?? { hour: -1, entries: 0, exits: 0 });
  const lit = peak.entries > 0 ? peak.hour : -1;
  const data = hours.map((h) => ({ hour: h.hour, entries: Number(h.entries.toFixed(2)) }));
  return (
    <div>
      <div className="h-56" role="img" aria-label={`Average entries per hour of the day, ${monthLabel}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="hour" tick={tickStyle} tickLine={false} axisLine={{ stroke: COLORS.grid }} tickFormatter={(h: number) => hourLabel(h).replace(" ", "")} interval={1} />
            <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TipCard
                    title={hourLabel(Number(label))}
                    rows={[{ label: "Entries on average", value: Number(payload[0]?.value ?? 0).toFixed(1), color: COLORS.entries }]}
                  />
                ) : null
              }
            />
            <Bar dataKey="entries" barSize={20} radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.hour} fill={d.hour === lit ? COLORS.entriesBright : COLORS.entries} fillOpacity={d.hour === lit ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {lit >= 0 && (
        <p className="mt-2 text-sm text-ink-muted">
          Busiest hour: <span className="font-semibold text-ink">{hourLabel(peak.hour)}</span>, with <span className="num font-semibold text-ink">{peak.entries.toFixed(1)}</span> entries on average.
        </p>
      )}
      <div className="sr-only">
        <table>
          <caption>Average entries per hour, {monthLabel}</caption>
          <thead>
            <tr>
              <th>Hour</th>
              <th>Entries</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.hour}>
                <td>{hourLabel(d.hour)}</td>
                <td>{d.entries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
