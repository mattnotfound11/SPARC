"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { formatClock, type DayReport } from "@/lib/sparc/selectors";

gsap.registerPlugin(useGSAP);

const FIRST_HOUR = 5;
const LAST_HOUR = 22;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

const M = { top: 12, right: 12, bottom: 26, left: 34 };
const H = 210;

/** Measures an element's width so the SVG renders at 1:1 and its labels stay legible on a phone. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([entry]) => setW(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(n: number) {
  if (n <= 10) return 10;
  const step = n <= 40 ? 10 : n <= 120 ? 20 : 50;
  return Math.ceil(n / step) * step;
}

function Axes({ w, max, x }: { w: number; max: number; x: (h: number) => number }) {
  const y = (v: number) => M.top + (1 - v / max) * (H - M.top - M.bottom);
  const ticks = [0, max / 2, max];
  return (
    <g className="text-ink-faint" fontSize="11">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={w - M.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.5 : 0.18} />
          <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fill="currentColor" className="num">
            {Math.round(t)}
          </text>
        </g>
      ))}
      {HOURS.filter((h) => h % 3 === 2).map((h) => (
        <text key={h} x={x(h)} y={H - 6} textAnchor="middle" fill="currentColor">
          {formatClock(h)}
        </text>
      ))}
    </g>
  );
}

/** Vehicles inside the building at the end of each hour, against capacity. */
export function OccupancyChart({ report, capacity }: { report: DayReport; capacity: number }) {
  const [wrap, w] = useWidth();
  const root = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(capacity, report.peakOccupancy));
  const inner = Math.max(0, w - M.left - M.right);
  const x = (h: number) => M.left + ((h - FIRST_HOUR) / (LAST_HOUR - FIRST_HOUR)) * inner;
  const y = (v: number) => M.top + (1 - v / max) * (H - M.top - M.bottom);

  const points = HOURS.map((h) => ({ h, v: report.hourly[h].occupancy })).filter((p): p is { h: number; v: number } => p.v !== null);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.h).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${x(points[points.length - 1].h).toFixed(1)} ${y(0)} L${x(points[0].h).toFixed(1)} ${y(0)} Z` : "";
  const active = hover !== null ? report.hourly[hover] : null;

  useGSAP(
    () => {
      if (!w) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const path = root.current?.querySelector<SVGPathElement>("[data-line]");
        if (path) {
          const len = path.getTotalLength();
          gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.out", clearProps: "strokeDasharray,strokeDashoffset" });
        }
        gsap.from("[data-area]", { opacity: 0, duration: 0.9, delay: 0.25, ease: "power2.out" });
      });
    },
    { scope: root, dependencies: [report.range.key, w > 0], revertOnUpdate: true },
  );

  return (
    <div ref={wrap}>
      <p className="mb-2 min-h-5 text-sm text-ink-muted" aria-live="polite">
        {active && active.occupancy !== null ? (
          <>
            <span className="font-semibold text-ink">{formatClock(active.hour)}</span> · <span className="num">{active.occupancy}</span> vehicles inside ·{" "}
            <span className="num">{active.entries}</span> in, <span className="num">{active.exits}</span> out
          </>
        ) : report.peakHour !== null ? (
          <>
            Busiest at <span className="font-semibold text-ink">{formatClock(report.peakHour)}</span> with{" "}
            <span className="num font-semibold text-ink">{report.peakOccupancy}</span> vehicles inside.
          </>
        ) : (
          "No vehicles recorded."
        )}
      </p>
      {w > 0 && (
        <svg ref={root} width={w} height={H} role="img" aria-label={`Vehicles inside by hour, ${report.range.label}. Capacity ${capacity}.`} onPointerLeave={() => setHover(null)}>
          <Axes w={w} max={max} x={x} />
          <line x1={M.left} x2={w - M.right} y1={y(capacity)} y2={y(capacity)} stroke="var(--color-crimson)" strokeDasharray="4 4" strokeOpacity={0.7} />
          <text x={w - M.right} y={y(capacity) - 5} textAnchor="end" fontSize="11" fill="var(--color-ink-muted)">
            Capacity {capacity}
          </text>
          {area && <path data-area d={area} fill="var(--color-live)" fillOpacity={0.12} />}
          {line && <path data-line d={line} fill="none" stroke="var(--color-live)" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />}
          {active && active.occupancy !== null && (
            <g>
              <line x1={x(active.hour)} x2={x(active.hour)} y1={M.top} y2={H - M.bottom} stroke="white" strokeOpacity={0.25} />
              <circle cx={x(active.hour)} cy={y(active.occupancy)} r={4.5} fill="var(--color-live)" stroke="var(--color-canvas)" strokeWidth={2} />
            </g>
          )}
          {HOURS.map((h) => (
            <rect
              key={h}
              x={x(h) - inner / (HOURS.length - 1) / 2}
              y={M.top}
              width={inner / (HOURS.length - 1)}
              height={H - M.top - M.bottom}
              fill="transparent"
              onPointerEnter={() => setHover(h)}
              onPointerMove={() => setHover(h)}
            />
          ))}
        </svg>
      )}
      <table className="sr-only">
        <caption>Vehicles inside at the end of each hour, {report.range.label}</caption>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Vehicles inside</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.h}>
              <td>{formatClock(p.h)}</td>
              <td>{p.v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Entries and exits per hour as paired bars. */
export function FlowChart({ report }: { report: DayReport }) {
  const [wrap, w] = useWidth();
  const root = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const peak = Math.max(1, ...HOURS.map((h) => Math.max(report.hourly[h].entries, report.hourly[h].exits)));
  const max = niceMax(peak);
  const inner = Math.max(0, w - M.left - M.right);
  const slot = inner / HOURS.length;
  const barW = Math.max(3, Math.min(14, slot / 2 - 2));
  const x = (h: number) => M.left + (h - FIRST_HOUR + 0.5) * slot;
  const y = (v: number) => M.top + (1 - v / max) * (H - M.top - M.bottom);
  const base = y(0);
  const active = hover !== null ? report.hourly[hover] : null;

  useGSAP(
    () => {
      if (!w) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-bar]", {
          scaleY: 0,
          transformOrigin: "50% 100%",
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.012,
          clearProps: "transform",
        });
      });
    },
    { scope: root, dependencies: [report.range.key, w > 0], revertOnUpdate: true },
  );

  return (
    <div ref={wrap}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
          {active ? (
            <>
              <span className="font-semibold text-ink">{formatClock(active.hour)}</span> · <span className="num">{active.entries}</span> entries,{" "}
              <span className="num">{active.exits}</span> exits
            </>
          ) : (
            "Hover or tap an hour for the numbers."
          )}
        </p>
        <ul className="flex items-center gap-4 text-[0.8125rem] text-ink-muted" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px] bg-gold" /> Entries
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px] bg-ink-soft/70" /> Exits
          </li>
        </ul>
      </div>
      {w > 0 && (
        <svg ref={root} width={w} height={H} role="img" aria-label={`Entries and exits per hour, ${report.range.label}`} onPointerLeave={() => setHover(null)}>
          <Axes w={w} max={max} x={x} />
          {HOURS.map((h) => {
            const p = report.hourly[h];
            const dim = hover !== null && hover !== h;
            return (
              <g key={h} opacity={dim ? 0.45 : 1} style={{ transition: "opacity 0.2s" }}>
                <rect data-bar style={{ transformBox: "fill-box" }} x={x(h) - barW - 1} y={y(p.entries)} width={barW} height={Math.max(0, base - y(p.entries))} rx={2} fill="var(--color-gold)" />
                <rect data-bar style={{ transformBox: "fill-box" }} x={x(h) + 1} y={y(p.exits)} width={barW} height={Math.max(0, base - y(p.exits))} rx={2} fill="var(--color-ink-soft)" fillOpacity={0.7} />
                <rect x={x(h) - slot / 2} y={M.top} width={slot} height={H - M.top - M.bottom} fill="transparent" onPointerEnter={() => setHover(h)} onPointerMove={() => setHover(h)} />
              </g>
            );
          })}
        </svg>
      )}
      <table className="sr-only">
        <caption>Entries and exits per hour, {report.range.label}</caption>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Entries</th>
            <th>Exits</th>
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h) => (
            <tr key={h}>
              <td>{formatClock(h)}</td>
              <td>{report.hourly[h].entries}</td>
              <td>{report.hourly[h].exits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
