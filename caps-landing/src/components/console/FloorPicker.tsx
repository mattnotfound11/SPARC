"use client";

import { Check, X } from "lucide-react";
import type { FloorStat } from "@/lib/sparc/selectors";

/**
 * Shown after a valid card at the entry scanner. The facilitator decides which floor the car goes to;
 * the system then books the first free bay on that floor. A full floor can't be picked.
 */
export function FloorPicker({
  name,
  walkIn = false,
  visitor = false,
  stats,
  onPick,
  onCancel,
}: {
  /** Who is entering: the member's name, or "Walk-in". */
  name: string;
  /** A driver let in on a paid receipt rather than a semester pass. */
  walkIn?: boolean;
  /** A pre-registered visitor card. */
  visitor?: boolean;
  stats: FloorStat[];
  onPick: (floor: number) => void;
  onCancel: () => void;
}) {
  const floors = [...stats].sort((a, b) => b.floor - a.floor); // the top level first, like the building
  const anyFree = floors.some((f) => f.free > 0);
  return (
    <div role="group" aria-labelledby="floor-pick-title" className="rounded-xl border border-live/40 bg-live/[0.08] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#86efac]">
            <Check className="size-4" aria-hidden />
            {walkIn ? "Receipt checked" : visitor ? "Visitor card confirmed" : "Pass is valid"}
          </p>
          <h3 id="floor-pick-title" className="mt-1 font-display text-xl font-semibold text-ink">
            {walkIn ? "Which floor for the walk-in?" : visitor ? "Which floor for the visitor?" : `Which floor for ${name}?`}
          </h3>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cancel entry" className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink">
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {floors.map((f) => (
          <button
            key={f.floor}
            type="button"
            disabled={f.free === 0}
            onClick={() => onPick(f.floor)}
            className="flex min-h-16 flex-col items-center justify-center rounded-lg border border-line-strong bg-surface-raised px-2 py-2 text-center transition-colors enabled:hover:border-gold enabled:hover:bg-gold/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="font-display text-base font-semibold text-ink">Level {f.floor}</span>
            <span className={`num text-xs ${f.free === 0 ? "text-crimson" : "text-ink-muted"}`}>{f.free === 0 ? "Full" : `${f.free} free`}</span>
          </button>
        ))}
      </div>
      {!anyFree && <p className="mt-3 text-sm text-crimson">Every floor is full right now.</p>}
    </div>
  );
}
