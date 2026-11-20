"use client";

import { useRef } from "react";
import { BellRing } from "lucide-react";
import { Badge, PageHeader, Panel, PanelHeader, useToast } from "@/components/console/ui";
import { useEnter } from "@/hooks/useConsoleMotion";
import { portal } from "@/lib/portal/store";
import { useParkedBay } from "@/lib/portal/useAlerts";
import { usePortalState } from "@/lib/portal/usePortal";
import { formatDateTime } from "@/lib/sparc/selectors";

const stay = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
};

export function ParkingView({ card }: { card: string }) {
  const root = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const state = usePortalState();
  const parked = useParkedBay(card);
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
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <p className="num font-display text-2xl font-semibold text-ink">{parked.ready ? parked.free : "..."}</p>
          <p className="text-xs text-ink-muted">bays free in the building right now</p>
        </div>
      </Panel>

      <Panel data-enter aria-labelledby="wait-title">
        <PanelHeader id="wait-title" title="Waitlist" />
        <div className="border-t border-line px-4 py-4 sm:px-5">
          {waiting ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-relaxed text-ink-soft">
                <BellRing className="mr-1.5 inline size-4 text-gold" aria-hidden />
                You&apos;ll get an alert when a bay is free.
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
              <p className="mb-3 text-sm leading-relaxed text-ink-muted">Building full? Ask to be told the moment a bay opens.</p>
              <div className="flex flex-wrap items-end gap-3">
                <button
                  type="button"
                  className="c-btn c-btn-gold"
                  onClick={() => {
                    const r = portal.joinWaitlist(card);
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
