"use client";

import { useRef, useState } from "react";
import { BellRing, CarFront, Truck } from "lucide-react";
import { Badge, PageHeader, Panel, PanelHeader, useToast } from "@/components/console/ui";
import { useEnter } from "@/hooks/useConsoleMotion";
import { portal } from "@/lib/portal/store";
import { useParkedBay } from "@/lib/portal/useAlerts";
import { usePortalState } from "@/lib/portal/usePortal";
import { VEHICLE_LABEL, formatDateTime } from "@/lib/sparc/selectors";
import type { VehicleClass } from "@/lib/sparc/types";

const stay = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
};

export function ParkingView({ card }: { card: string }) {
  const root = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const state = usePortalState();
  const parked = useParkedBay(card);
  const [type, setType] = useState<VehicleClass>("light");
  useEnter(root);

  const waiting = (state.waitlist ?? []).find((w) => w.ownerCard === card);

  return (
    <div ref={root} className="space-y-5">
      <PageHeader title="My parking" description="Where your car is parked right now, how many bays are free, and an alert for when one opens." />

      <Panel data-enter aria-labelledby="session-title">
        <PanelHeader id="session-title" title="Right now" aside={parked.ready && parked.slot ? <Badge tone="live">Parked</Badge> : <Badge>Not parked</Badge>} />
        <div className="border-t border-line px-4 py-4 sm:px-5">
          {!parked.ready ? (
            <p className="text-sm text-ink-muted">Loading...</p>
          ) : !parked.user ? (
            <p className="text-sm leading-relaxed text-ink-muted">This card isn&apos;t registered at the gate yet, so there is no parking session to show.</p>
          ) : !parked.slot ? (
            <p className="text-sm leading-relaxed text-ink-muted">Your car isn&apos;t parked in the building. Your session appears here once you tap in.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-ink-muted">Bay</dt>
                <dd className="num font-display text-2xl font-semibold text-ink">{parked.slot.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Level</dt>
                <dd className="num font-display text-2xl font-semibold text-ink">{parked.slot.floor}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Since</dt>
                <dd className="num text-base font-semibold text-ink">{formatDateTime(parked.slot.occupant!.since)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Parked for</dt>
                <dd className="num text-base font-semibold text-ink">{stay(parked.now - parked.slot.occupant!.since)}</dd>
              </div>
            </dl>
          )}
        </div>
      </Panel>

      <Panel data-enter aria-labelledby="free-title">
        <PanelHeader id="free-title" title="Free bays" />
        <ul className="grid border-t border-line sm:grid-cols-2">
          {(["light", "heavy"] as const).map((c) => {
            const Icon = c === "heavy" ? Truck : CarFront;
            const n = parked.ready ? parked.free[c] : null;
            return (
              <li key={c} className="flex items-center gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:px-5 sm:max-md:border-b-0">
                <Icon className="size-5 text-ink-muted" aria-hidden />
                <div>
                  <p className="num font-display text-2xl font-semibold text-ink">{n ?? "..."}</p>
                  <p className="text-xs text-ink-muted">{VEHICLE_LABEL[c]}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel data-enter aria-labelledby="wait-title">
        <PanelHeader id="wait-title" title="Waitlist" />
        <div className="border-t border-line px-4 py-4 sm:px-5">
          {waiting ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-relaxed text-ink-soft">
                <BellRing className="mr-1.5 inline size-4 text-gold" aria-hidden />
                You&apos;ll get an alert when a {VEHICLE_LABEL[waiting.vehicle].toLowerCase()} bay is free.
              </p>
              <button
                type="button"
                className="c-btn c-btn-sm"
                onClick={() => {
                  portal.leaveWaitlist(card);
                  toast("Removed from the waitlist.");
                }}
              >
                Leave waitlist
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm leading-relaxed text-ink-muted">Building full? Ask to be told the moment a bay of your vehicle type opens.</p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="wait-type" className="mb-1.5 block text-sm font-semibold text-ink">
                    Vehicle type
                  </label>
                  <select id="wait-type" className="c-input" value={type} onChange={(e) => setType(e.target.value as VehicleClass)}>
                    <option value="light">{VEHICLE_LABEL.light}</option>
                    <option value="heavy">{VEHICLE_LABEL.heavy}</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="c-btn c-btn-gold"
                  onClick={() => {
                    const r = portal.joinWaitlist(card, type);
                    toast(r.ok ? "You're on the waitlist. Check Alerts." : r.error, r.ok ? "ok" : "error");
                  }}
                >
                  <BellRing className="size-4" aria-hidden />
                  Alert me when a bay is free
                </button>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
