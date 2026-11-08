"use client";

import { availabilityTone, type FloorStat } from "@/lib/sparc/selectors";
import { Badge, Count } from "./ui";
import { VEHICLE_LABEL } from "@/lib/sparc/selectors";

const bar = { crimson: "bg-crimson", gold: "bg-gold", live: "bg-live" } as const;

/** One row per floor with free count and a fill bar. Selectable when `onSelect` is given. */
export function FloorList({
  stats,
  selected,
  onSelect,
}: {
  stats: FloorStat[];
  selected?: number;
  onSelect?: (floor: number) => void;
}) {
  return (
    <ul className="space-y-1.5" aria-label="Floors">
      {stats.map((f) => {
        const tone = availabilityTone(f.free, f.total);
        const used = f.total ? ((f.total - f.free) / f.total) * 100 : 0;
        const active = selected === f.floor;
        const content = (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="font-display text-[0.9375rem] font-semibold text-ink">Floor {f.floor}</span>
                <span className="hidden text-xs text-ink-muted min-[420px]:inline">{VEHICLE_LABEL[f.vehicle]}</span>
              </span>
              {f.free === 0 ? (
                <Badge tone="crimson">Full</Badge>
              ) : (
                <span className="text-sm text-ink-soft">
                  <Count value={f.free} className="font-semibold text-ink" /> free
                  <span className="text-ink-faint"> / {f.total}</span>
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
              <div
                className={`h-full rounded-full ${bar[tone]}`}
                style={{ width: `${used}%`, transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.4s" }}
              />
            </div>
          </>
        );
        const cls = `block w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
          active ? "border-gold/45 bg-gold/[0.07]" : "border-line bg-field/60"
        }`;
        return (
          <li key={f.floor}>
            {onSelect ? (
              <button type="button" aria-pressed={active} onClick={() => onSelect(f.floor)} className={`${cls} hover:border-gold/35`}>
                {content}
              </button>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
