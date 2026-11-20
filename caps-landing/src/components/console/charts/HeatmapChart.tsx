"use client";

import { useState } from "react";
import { WEEKDAYS, WEEK_ORDER, hourLabel, type Heatmap } from "@/lib/analytics/analytics";
import { COLORS, TipCard } from "./chartTheme";

const FIRST_HOUR = 5;
const LAST_HOUR = 22;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

/** One-hue gold scale: quiet cells are barely there, the busiest is solid. */
const shade = (share: number) => `rgba(245, 179, 1, ${(0.08 + share * 0.92).toFixed(2)})`;

/** Average entries by weekday and hour. Recharts has no heatmap, so this is a plain grid with a scale legend. */
export function HeatmapChart({ heat, monthLabel }: { heat: Heatmap; monthLabel: string }) {
  const [hover, setHover] = useState<{ weekday: number; hour: number } | null>(null);
  const active = hover ? heat.grid[hover.weekday][hover.hour] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
          {heat.peak ? (
            <>
              Busiest: <span className="font-semibold text-ink">{WEEKDAYS[heat.peak.weekday]}s at {hourLabel(heat.peak.hour)}</span>, with{" "}
              <span className="num font-semibold text-ink">{heat.peak.average.toFixed(1)}</span> entries on average.
            </>
          ) : (
            "Hover a square for the numbers."
          )}
        </p>
        <div className="flex items-center gap-2 text-xs text-ink-muted" aria-hidden>
          Quieter
          <span className="h-2.5 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${shade(0)}, ${shade(1)})` }} />
          Busier
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <div className="min-w-[34rem]" onPointerLeave={() => setHover(null)} role="img" aria-label={`Average entries by weekday and hour, ${monthLabel}`}>
          {WEEK_ORDER.map((w) => (
            <div key={w} className="flex items-center gap-[3px] py-[1.5px]">
              <span className="w-10 shrink-0 text-xs text-ink-muted">{WEEKDAYS[w].slice(0, 3)}</span>
              {HOURS.map((h) => {
                const v = heat.grid[w][h];
                const share = heat.max ? v / heat.max : 0;
                const isPeak = heat.peak?.weekday === w && heat.peak?.hour === h;
                return (
                  <span
                    key={h}
                    onPointerEnter={() => setHover({ weekday: w, hour: h })}
                    className="h-7 flex-1 rounded-[5px]"
                    style={{
                      background: v > 0 ? shade(share) : "rgba(255,255,255,0.03)",
                      outline: hover?.weekday === w && hover?.hour === h ? `2px solid ${COLORS.cursor}` : isPeak ? `1.5px solid ${COLORS.entriesBright}` : "none",
                      outlineOffset: hover?.weekday === w && hover?.hour === h ? 1 : 0,
                    }}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex gap-[3px] pt-1.5">
            <span className="w-10 shrink-0" />
            {HOURS.map((h) => (
              <span key={h} className="flex-1 text-center text-[0.625rem] text-ink-muted">
                {(h - FIRST_HOUR) % 2 === 0 ? hourLabel(h).replace(" ", "") : ""}
              </span>
            ))}
          </div>
        </div>
        {hover && active !== null && (
          <div className="pointer-events-none absolute top-0 right-0 hidden sm:block">
            <TipCard
              title={`${WEEKDAYS[hover.weekday]} ${hourLabel(hover.hour)}`}
              rows={[{ label: "Entries on average", value: active.toFixed(1), color: COLORS.entries }]}
            />
          </div>
        )}
      </div>

      <div className="sr-only">
        <table>
          <caption>Average entries per hour by weekday, {monthLabel}</caption>
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
  );
}
