"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Count } from "@/components/console/ui";
import { FloorList } from "@/components/console/FloorList";
import { SlotMap } from "@/components/console/SlotMap";
import { Reveal } from "@/components/ui/Reveal";
import { useEnter } from "@/hooks/useConsoleMotion";
import { SparcGate, SparcProvider, useNow, useSparcState } from "@/lib/sparc/SparcProvider";
import { buildingTotals, floorStats, formatTime } from "@/lib/sparc/selectors";

function Content() {
  const root = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  const clock = useNow(30000);
  const stats = floorStats(state.config, state.slots);
  const totals = buildingTotals(stats);
  const [floor, setFloor] = useState(1);
  useEnter(root);

  return (
    <div ref={root}>
      <div data-enter>
        <h1 className="display-xl text-[clamp(2.25rem,6vw,3.5rem)] text-ink">Slots available now</h1>
        <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted">
          Check the building before you drive in. You pick your exact slot on the kiosk at the gate, after you tap your campus ID.
        </p>
        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-[3.25rem] leading-none font-semibold tracking-tight text-ink">
            <Count value={totals.free} />
          </span>
          <span className="text-lg text-ink-muted">of {totals.total} slots free</span>
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-faint">
          <span className="dot-pulse size-1.5 rounded-full bg-live" aria-hidden />
          Simulated demo feed · refreshed {formatTime(Math.max(clock, state.now))}
        </p>
      </div>

      <Reveal className="mt-10">
        <div className="grid gap-5 rounded-2xl border border-line bg-surface/80 p-4 sm:p-6 lg:grid-cols-[17rem_1fr] lg:gap-8">
          <div>
            <h2 className="mb-3 font-display text-[1.0625rem] font-semibold text-ink">Floors</h2>
            <FloorList stats={stats} selected={floor} onSelect={setFloor} />
          </div>
          <div className="min-w-0">
            <SlotMap slots={state.slots} floor={floor} />
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-8" delay={60}>
        <p className="text-sm leading-relaxed text-ink-muted">
          Floors 1–2 are for SUVs and vans, floors 3–5 for lighter vehicles.{" "}
          <Link href="/signup" className="inline-flex items-center gap-1 font-semibold text-ink underline-offset-4 transition-colors hover:text-gold hover:underline">
            Register your vehicle <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </Reveal>
    </div>
  );
}

export function AvailabilityView() {
  return (
    <SparcProvider>
      <SparcGate
        fallback={
          <div aria-busy="true" aria-label="Loading availability" className="space-y-5">
            <div className="h-14 w-3/4 animate-pulse rounded-lg bg-white/[0.05]" />
            <div className="h-80 animate-pulse rounded-2xl bg-white/[0.04]" />
          </div>
        }
      >
        <Content />
      </SparcGate>
    </SparcProvider>
  );
}
