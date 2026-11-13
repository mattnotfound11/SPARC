"use client";

import { useSparcState, useSparcStoreOrNull } from "@/lib/sparc/SparcProvider";
import { useSharedAvailability } from "@/lib/sparc/useShared";
import { availabilityTone, buildingTotals, floorStats } from "@/lib/sparc/selectors";

const TONE = {
  live: { dot: "bg-live", text: "text-live", label: "Plenty of space", hint: "Slots are open, no need to wait." },
  gold: { dot: "bg-gold", text: "text-gold", label: "Filling up", hint: "Slots are going fast. Arrive early." },
  crimson: { dot: "bg-crimson", text: "text-crimson", label: "Almost full", hint: "Very few slots left." },
} as const;

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto mt-10 inline-flex min-w-[15rem] flex-col items-center gap-1.5 rounded-2xl border border-line-strong bg-white/[0.03] px-7 py-5 backdrop-blur"
    >
      {children}
    </div>
  );
}

function Heading({ dot }: { dot: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted">
      <span className={`dot-pulse size-1.5 rounded-full ${dot}`} aria-hidden />
      Live parking count
    </p>
  );
}

function Live() {
  const state = useSparcState();
  const shared = useSharedAvailability();
  const local = buildingTotals(floorStats(state.config, state.slots));
  const { free, total } = shared ?? local;
  const full = free === 0;
  const tone = full ? { ...TONE.crimson, label: "Parking full", hint: "No slots free right now. Expect to wait." } : TONE[availabilityTone(free, total)];

  return (
    <Box>
      <Heading dot={tone.dot} />
      <p className="font-display leading-none font-semibold tracking-tight text-ink">
        <span className="num text-[3.25rem]">{free}</span>
        <span className="text-xl font-normal text-ink-faint"> / {total} slots free</span>
      </p>
      <p className={`text-sm font-semibold ${tone.text}`}>{tone.label}</p>
      <p className="text-[0.8125rem] text-ink-faint">{tone.hint}</p>
    </Box>
  );
}

/** Free slots right now, from the same live store the gate scanner updates. */
export function LiveSlotCount() {
  const store = useSparcStoreOrNull();
  if (!store)
    return (
      <Box>
        <Heading dot="bg-ink-faint" />
        <p className="font-display text-[3.25rem] leading-none font-semibold text-ink-faint">--</p>
        <p className="text-sm text-ink-faint">Checking the lot…</p>
      </Box>
    );
  return <Live />;
}
