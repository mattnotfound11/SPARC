"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Gavel, X } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/portal/labels";
import { portal } from "@/lib/portal/store";
import { usePortalState } from "@/lib/portal/usePortal";
import type { Appeal, Violation } from "@/lib/portal/types";
import { useSparcStore } from "@/lib/sparc/SparcProvider";
import { formatDateTime } from "@/lib/sparc/selectors";
import { cardKey } from "@/lib/sparc/store";
import { Badge, EmptyState, PageHeader, Panel, PanelHeader, useToast } from "./ui";

const lastFour = (card: string) => `card ending ${card.slice(-4)}`;

function Details({ v, appeal }: { v: Violation; appeal?: Appeal }) {
  const label = TYPE_LABEL[v.type];
  return (
    <>
      <p className="font-semibold text-ink">{label.title}</p>
      <p className="mt-0.5 text-sm text-ink-muted">{label.detail}</p>
      <p className="num mt-1 text-xs text-ink-faint">
        {formatDateTime(v.at)} · {lastFour(v.ownerCard)}
        {v.plate && (
          <>
            {" · "}
            <span className="font-mono">{v.plate}</span>
          </>
        )}
      </p>
      {appeal && (
        <blockquote className="mt-3 rounded-lg border border-line bg-field/60 px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
          <span className="block text-xs text-ink-muted">Driver&apos;s appeal, {formatDateTime(appeal.createdAt)}</span>
          {appeal.note}
        </blockquote>
      )}
    </>
  );
}

export function AppealsView() {
  const root = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const state = usePortalState();
  const sparc = useSparcStore();
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  useEnter(root);

  const appealFor = (id: string) => state.appeals.find((a) => a.violationId === id);

  // Appeals come before plain flags, and whatever has waited longest comes first
  const pending = useMemo(
    () =>
      state.violations
        .filter((v) => v.status === "open" || v.status === "appealed")
        .sort((a, b) => (a.status === b.status ? a.at - b.at : a.status === "appealed" ? -1 : 1)),
    [state.violations],
  );
  const decided = useMemo(
    () => state.violations.filter((v) => v.status === "confirmed" || v.status === "dismissed").sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0)),
    [state.violations],
  );
  const appealCount = pending.filter((v) => v.status === "appealed").length;
  const list = tab === "pending" ? pending : decided;

  // Demo: make sample drivers if the console has none yet, then give them violations and appeals
  function loadSample() {
    if (sparc.getState().logs.length === 0) sparc.loadSample();
    portal.seedDrivers(sparc.getState().users.map((u) => ({ card: cardKey(u.nfcId), type: u.vehicle })));
  }

  function decide(v: Violation, decision: "confirm" | "dismiss") {
    const r = portal.reviewViolation(v.id, decision);
    const what = TYPE_LABEL[v.type].title.toLowerCase();
    toast(r.ok ? (decision === "confirm" ? `The ${what} stands. The strike is confirmed.` : `The ${what} is dismissed. No strike.`) : r.error, r.ok ? "ok" : "error");
  }

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Appeals"
        description="Review what the gate flagged and what drivers dispute. Confirming a violation keeps the strike; dismissing it cancels the strike."
      />

      <div data-enter className="seg" role="tablist" aria-label="Show">
        <button type="button" role="tab" aria-selected={tab === "pending"} onClick={() => setTab("pending")}>
          Needs review ({pending.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "decided"} onClick={() => setTab("decided")}>
          Decided ({decided.length})
        </button>
      </div>

      <Panel data-enter aria-labelledby="queue-title">
        <PanelHeader
          id="queue-title"
          title={tab === "pending" ? "Waiting for a decision" : "Past decisions"}
          aside={tab === "pending" && appealCount > 0 ? <Badge tone="gold">{appealCount} appeal{appealCount === 1 ? "" : "s"}</Badge> : undefined}
        />
        {list.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState
              title={tab === "pending" ? "Nothing waiting" : "No decisions yet"}
              action={
                state.violations.length === 0 ? (
                  <button type="button" className="c-btn c-btn-gold" onClick={loadSample}>
                    Load sample violations (demo)
                  </button>
                ) : undefined
              }
            >
              {tab === "pending"
                ? "When the gate flags an overstay, overnight parking or a repeat entry, or a driver sends an appeal, it lands here."
                : "Violations you confirm or dismiss are listed here."}
            </EmptyState>
          </div>
        ) : (
          <ul className="border-t border-line">
            {list.map((v) => {
              const appeal = appealFor(v.id);
              const status = STATUS_LABEL[v.status];
              return (
                <li key={v.id} className="border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                    <div className="min-w-0 flex-1 basis-72">
                      <Details v={v} appeal={appeal} />
                    </div>
                    {tab === "pending" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="c-btn c-btn-sm" onClick={() => decide(v, "dismiss")}>
                          <X className="size-3.5" aria-hidden />
                          {v.status === "appealed" ? "Uphold appeal" : "Dismiss flag"}
                        </button>
                        <button type="button" className="c-btn c-btn-sm c-btn-danger" onClick={() => decide(v, "confirm")}>
                          <Check className="size-3.5" aria-hidden />
                          {v.status === "appealed" ? "Reject appeal" : "Confirm violation"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {v.reviewedAt && <p className="num mt-1 text-xs text-ink-faint">{formatDateTime(v.reviewedAt)}</p>}
                      </div>
                    )}
                  </div>
                  {tab === "pending" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
                      <Gavel className="size-3.5" aria-hidden />
                      {v.status === "appealed" ? "Upholding the appeal cancels the strike. Rejecting it keeps the strike." : "Dismissing a flag cancels the strike. Confirming keeps it."}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
