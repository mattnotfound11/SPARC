"use client";

import { useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, Save } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { MAX_SLOTS_PER_FLOOR } from "@/lib/sparc/seed";
import { useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import { VEHICLE_LABEL } from "@/lib/sparc/selectors";
import type { FloorConfig, VehicleClass } from "@/lib/sparc/types";
import { Count, PageHeader, Panel, PanelHeader, useToast } from "./ui";

export function SlotSetupView() {
  const root = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  const store = useSparcStore();
  const toast = useToast();
  useEnter(root);

  const [draft, setDraft] = useState<FloorConfig[]>(() => state.config.map((f) => ({ ...f })));
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => draft.some((f, i) => f.slots !== state.config[i]?.slots || f.vehicle !== state.config[i]?.vehicle),
    [draft, state.config],
  );

  /** Highest slot number currently in use on each floor: the floor can't shrink below it. */
  const floorLimits = useMemo(
    () =>
      draft.map((f) => {
        const inUse = state.slots.filter((s) => s.floor === f.floor && s.status !== "free");
        return { inUse: inUse.length, min: Math.max(1, ...inUse.map((s) => s.index)) };
      }),
    [draft, state.slots],
  );

  const totals = useMemo(
    () => ({
      all: draft.reduce((n, f) => n + f.slots, 0),
      heavy: draft.filter((f) => f.vehicle === "heavy").reduce((n, f) => n + f.slots, 0),
      light: draft.filter((f) => f.vehicle === "light").reduce((n, f) => n + f.slots, 0),
    }),
    [draft],
  );

  function patch(i: number, change: Partial<FloorConfig>) {
    setError(null);
    setDraft((d) => d.map((f, idx) => (idx === i ? { ...f, ...change } : f)));
  }

  function setCount(i: number, raw: number) {
    if (Number.isNaN(raw)) return;
    patch(i, { slots: Math.min(MAX_SLOTS_PER_FLOOR, Math.max(0, Math.round(raw))) });
  }

  function save() {
    const result = store.saveConfig(draft);
    if (!result.ok) {
      setError(result.error);
      toast(result.error, "error");
      return;
    }
    setError(null);
    toast(`Floor setup saved. The building now has ${totals.all} slots.`);
  }

  function reset() {
    setDraft(state.config.map((f) => ({ ...f })));
    setError(null);
  }

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Slots and floors"
        description="Set how many slots each floor has and which vehicles it takes. Drivers only see slots that fit their vehicle at the kiosk."
        actions={
          <>
            <button type="button" className="c-btn" onClick={reset} disabled={!dirty}>
              <RotateCcw className="size-4" aria-hidden />
              Discard changes
            </button>
            <button type="button" className="c-btn c-btn-gold" onClick={save} disabled={!dirty}>
              <Save className="size-4" aria-hidden />
              Save setup
            </button>
          </>
        }
      />

      <div data-enter className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <Panel aria-labelledby="setup-title">
          <PanelHeader id="setup-title" title="Floors" />
          <ul className="border-t border-line">
            {draft.map((f, i) => {
              const lim = floorLimits[i];
              const typeLocked = lim.inUse > 0;
              const id = `slots-${f.floor}`;
              return (
                <li key={f.floor} className="grid gap-x-6 gap-y-3 border-b border-line px-4 py-4 last:border-b-0 sm:px-5 md:grid-cols-[6rem_1fr_auto] md:items-center">
                  <div>
                    <p className="font-display text-base font-semibold text-ink">Floor {f.floor}</p>
                    <p className="num text-xs text-ink-muted">
                      {String.fromCharCode(64 + f.floor)}1–{String.fromCharCode(64 + f.floor)}
                      {Math.max(1, f.slots)}
                    </p>
                  </div>

                  <div>
                    <div className="seg" role="group" aria-label={`Vehicle type for floor ${f.floor}`}>
                      {(["heavy", "light"] as VehicleClass[]).map((v) => (
                        <button key={v} type="button" aria-pressed={f.vehicle === v} disabled={typeLocked && f.vehicle !== v} onClick={() => patch(i, { vehicle: v })}>
                          {VEHICLE_LABEL[v]}
                        </button>
                      ))}
                    </div>
                    {typeLocked && (
                      <p className="mt-1.5 text-xs text-ink-muted">
                        {lim.inUse} slot{lim.inUse === 1 ? "" : "s"} in use right now, so the type can&apos;t change.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={id} className="sr-only">
                      Slots on floor {f.floor}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button type="button" className="c-btn !w-10 !px-0" onClick={() => setCount(i, f.slots - 1)} disabled={f.slots <= lim.min} aria-label={`Remove a slot from floor ${f.floor}`}>
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <input
                        id={id}
                        type="number"
                        inputMode="numeric"
                        min={lim.min}
                        max={MAX_SLOTS_PER_FLOOR}
                        value={Number.isNaN(f.slots) ? "" : f.slots}
                        onChange={(e) => setCount(i, e.target.valueAsNumber)}
                        className="c-input num w-[4.5rem] text-center"
                        aria-describedby={lim.inUse ? `${id}-note` : undefined}
                      />
                      <button type="button" className="c-btn !w-10 !px-0" onClick={() => setCount(i, f.slots + 1)} disabled={f.slots >= MAX_SLOTS_PER_FLOOR} aria-label={`Add a slot to floor ${f.floor}`}>
                        <Plus className="size-4" aria-hidden />
                      </button>
                    </div>
                    {lim.inUse > 0 && (
                      <p id={`${id}-note`} className="mt-1.5 text-xs text-ink-muted md:text-right">
                        Minimum {lim.min}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {error && (
            <p role="alert" className="border-t border-line px-4 py-3 text-sm text-[#ff9aab] sm:px-5">
              {error}
            </p>
          )}
        </Panel>

        <Panel aria-labelledby="summary-title" className="h-fit p-4 sm:p-5">
          <h2 id="summary-title" className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
            After saving
          </h2>
          <p className="mt-3 font-display text-[2.5rem] leading-none font-semibold tracking-tight text-ink">
            <Count value={totals.all} />
            <span className="text-lg font-normal text-ink-faint"> slots</span>
          </p>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-ink-muted">SUV / Van floors</dt>
              <dd className="num font-semibold text-ink">{totals.heavy}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-muted">Light vehicle floors</dt>
              <dd className="num font-semibold text-ink">{totals.light}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
            New slots start free. Removing slots takes them from the end of the floor, and only free ones can go.
          </p>
        </Panel>
      </div>
    </div>
  );
}
