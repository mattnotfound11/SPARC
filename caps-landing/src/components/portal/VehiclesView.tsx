"use client";

import { useRef, useState } from "react";
import { Car, CarFront, Check, Plus, Trash2 } from "lucide-react";
import { Badge, EmptyState, Field, PageHeader, Panel, PanelHeader, useToast } from "@/components/console/ui";
import { useEnter } from "@/hooks/useConsoleMotion";
import { portal, normalizePlate } from "@/lib/portal/store";
import { usePortalState } from "@/lib/portal/usePortal";
import { MAX_VEHICLES, type Vehicle } from "@/lib/portal/types";

function VehicleForm({ card, temporary, onDone }: { card: string; temporary: boolean; onDone: () => void }) {
  const toast = useToast();
  const [plate, setPlate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { plate };
    const result = temporary ? portal.addTemporary(card, input) : portal.addVehicle(card, input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast(temporary ? `${normalizePlate(plate)} is valid for today. Your entry will be flagged for admin review.` : `${normalizePlate(plate)} added.`);
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="border-t border-line px-4 py-4 sm:px-5">
      <div className="grid gap-4">
        <Field label="Plate number" htmlFor="v-plate" error={error ?? undefined}>
          <input
            id="v-plate"
            className="c-input w-full font-mono uppercase"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={plate}
            onChange={(e) => {
              setPlate(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "v-plate-error" : undefined}
          />
        </Field>
      </div>
      {temporary && (
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
          For a borrowed or rental car. It is valid until midnight tonight, and the gate flags its entry for an admin to review.
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="c-btn" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="c-btn c-btn-gold">
          {temporary ? "Add for today" : "Add vehicle"}
        </button>
      </div>
    </form>
  );
}

export function VehiclesView({ card }: { card: string }) {
  const root = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const state = usePortalState();
  const [adding, setAdding] = useState<"owned" | "temporary" | null>(null);
  const [now] = useState(() => Date.now());
  useEnter(root);

  const mine = state.vehicles.filter((v) => v.ownerCard === card);
  const owned = mine.filter((v) => v.kind === "owned");
  const temporary = mine.filter((v) => v.kind === "temporary" && (v.validUntil ?? 0) >= now);
  const activeId = state.activeVehicle[card];
  const full = owned.length >= MAX_VEHICLES;

  function row(v: Vehicle) {
    const active = activeId === v.id;
    return (
      <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-gold/15 text-gold" : "bg-white/[0.05] text-ink-soft"}`}>
          <CarFront className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-mono text-[0.9375rem] font-semibold text-ink">
            {v.plate}
            {active && (
              <Badge tone="gold">
                <Check className="size-3" aria-hidden />
                Using today
              </Badge>
            )}
            {v.kind === "temporary" && <Badge tone="crimson">Today only</Badge>}
          </p>
          <p className="text-sm text-ink-muted">{v.kind === "temporary" ? "Entry flagged for review" : "Registered vehicle"}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {!active && (
            <button
              type="button"
              className="c-btn c-btn-sm"
              onClick={() => {
                const r = portal.setActive(card, v.id);
                toast(r.ok ? `${v.plate} is your vehicle for today.` : r.error, r.ok ? "ok" : "error");
              }}
            >
              Use today
            </button>
          )}
          <button
            type="button"
            className="c-btn c-btn-sm c-btn-danger"
            aria-label={`Remove ${v.plate}`}
            onClick={() => {
              portal.removeVehicle(card, v.id);
              toast(`${v.plate} removed.`);
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
            <span className="sr-only sm:not-sr-only">Remove</span>
          </button>
        </div>
      </li>
    );
  }

  return (
    <div ref={root} className="space-y-5">
      <PageHeader
        title="My vehicles"
        description={`Register up to ${MAX_VEHICLES} cars on your card, and pick the one you're driving today so the gate knows what to expect.`}
      />

      <Panel data-enter aria-labelledby="owned-title">
        <PanelHeader
          id="owned-title"
          title={`Registered (${owned.length}/${MAX_VEHICLES})`}
          aside={
            <button type="button" className="c-btn c-btn-sm" disabled={full || adding === "owned"} onClick={() => setAdding("owned")}>
              <Plus className="size-3.5" aria-hidden />
              Add vehicle
            </button>
          }
        />
        {owned.length === 0 && adding !== "owned" ? (
          <div className="border-t border-line">
            <EmptyState
              title="No vehicles yet"
              action={
                <button type="button" className="c-btn c-btn-gold" onClick={() => setAdding("owned")}>
                  <Car className="size-4" aria-hidden />
                  Add your first vehicle
                </button>
              }
            >
              Add the plate and type of the car you drive. The gate matches your card to it.
            </EmptyState>
          </div>
        ) : (
          <ul className="border-t border-line">{owned.map(row)}</ul>
        )}
        {full && <p className="border-t border-line px-4 py-3 text-[0.8125rem] text-ink-muted sm:px-5">You&apos;ve reached the {MAX_VEHICLES}-vehicle limit. Remove one to add another.</p>}
        {adding === "owned" && <VehicleForm card={card} temporary={false} onDone={() => setAdding(null)} />}
      </Panel>

      <Panel data-enter aria-labelledby="temp-title">
        <PanelHeader
          id="temp-title"
          title="Borrowed or rental car"
          aside={
            <button type="button" className="c-btn c-btn-sm" disabled={adding === "temporary"} onClick={() => setAdding("temporary")}>
              <Plus className="size-3.5" aria-hidden />
              Add for today
            </button>
          }
        />
        {temporary.length > 0 ? (
          <ul className="border-t border-line">{temporary.map(row)}</ul>
        ) : (
          adding !== "temporary" && <p className="border-t border-line px-4 py-4 text-sm text-ink-muted sm:px-5">Driving a different car today? Add its plate for one day.</p>
        )}
        {adding === "temporary" && <VehicleForm card={card} temporary onDone={() => setAdding(null)} />}
      </Panel>

      <p data-enter className="text-[0.8125rem] leading-relaxed text-ink-faint">
        If the plate at the gate matches none of your cars, the car is held for a marshal instead of being turned away.
      </p>
    </div>
  );
}
