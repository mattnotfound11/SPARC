import type { ViolationType } from "@/lib/portal/types";

/*
 * Colors for the Reports charts, checked against the console surface (#0f121a) with the dataviz
 * validator. Entries wear the brand gold, the one slot outside the validator's lightness band: it is
 * the product's accent, and its pairing with the exits blue clears the colour-blind and contrast checks.
 * Text never takes a series colour; a swatch beside it carries identity.
 */
export const COLORS = {
  entries: "#f5b301",
  entriesBright: "#ffc424",
  exits: "#3987e5",
  surface: "#0f121a",
  grid: "rgba(255, 255, 255, 0.07)",
  axis: "#5d6270",
  tick: "#8b909c",
  cursor: "rgba(255, 255, 255, 0.18)",
} as const;

export const VIOLATION: Record<ViolationType, { label: string; color: string }> = {
  overstay: { label: "Overstay", color: "#3987e5" },
  overnight: { label: "Overnight", color: "#d95926" },
  "anti-passback": { label: "Second entry without exit", color: "#199e70" },
  temporary: { label: "Temporary vehicle", color: "#9085e9" },
};

export const tickStyle = { fill: COLORS.tick, fontSize: 11 } as const;

export function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/** A chart legend: a swatch beside the name, the name in text colour. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-muted" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <Swatch color={i.color} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

type Row = { label: string; value: string; color?: string };

/** The one tooltip shape every chart uses. */
export function TipCard({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="rounded-lg border border-line-strong bg-surface-raised px-3 py-2 text-xs shadow-[0_12px_30px_-12px_rgba(0,0,0,0.9)]">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-5 text-ink-muted">
          <span className="flex items-center gap-1.5">
            {r.color && <Swatch color={r.color} />}
            {r.label}
          </span>
          <span className="num font-semibold text-ink">{r.value}</span>
        </p>
      ))}
    </div>
  );
}
