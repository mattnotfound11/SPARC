"use client";

import { useRef, useState } from "react";
import { MessageSquareText, ShieldCheck } from "lucide-react";
import { Badge, EmptyState, PageHeader, Panel, PanelHeader, useToast } from "@/components/console/ui";
import { useEnter } from "@/hooks/useConsoleMotion";
import { portal } from "@/lib/portal/store";
import { usePortalState } from "@/lib/portal/usePortal";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/portal/labels";
import { STRIKE_WINDOW_DAYS, standingFor } from "@/lib/portal/strikes";
import type { Violation } from "@/lib/portal/types";
import { formatDateTime } from "@/lib/sparc/selectors";

function AppealForm({ violation, onDone }: { violation: Violation; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = `appeal-${violation.id}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = portal.appeal(violation.id, note);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast("Appeal sent. An admin will review it.");
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 border-t border-line pt-3">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        Why should this be dismissed?
      </label>
      <textarea
        id={id}
        rows={3}
        autoFocus
        className="c-input w-full resize-y py-2 leading-relaxed"
        style={{ height: "auto" }}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setError(null);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder="Tell the admin what happened."
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.8125rem] text-[#ff9aab]">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="c-btn c-btn-sm" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="c-btn c-btn-sm c-btn-gold">
          Send appeal
        </button>
      </div>
    </form>
  );
}

export function ViolationsView({ card }: { card: string }) {
  const root = useRef<HTMLDivElement>(null);
  const state = usePortalState();
  const [appealing, setAppealing] = useState<string | null>(null);
  useEnter(root);

  const mine = state.violations.filter((v) => v.ownerCard === card).sort((a, b) => b.at - a.at);
  const open = mine.filter((v) => v.status === "open").length;
  const standing = standingFor(state.violations, card);

  return (
    <div ref={root} className="space-y-5">
      <PageHeader
        title="Violations"
        description="Strikes on your card. If you think one is a mistake, send an appeal and an admin will review it."
      />

      <Panel data-enter aria-labelledby="standing-title">
        <PanelHeader
          id="standing-title"
          title={standing.suspended ? "Card suspended" : `${standing.strikes} of ${standing.limit} strikes`}
          aside={<Badge tone={standing.suspended ? "crimson" : standing.strikes ? "gold" : "live"}>{standing.suspended ? "Suspended" : standing.strikes ? "Warning" : "Good standing"}</Badge>}
        />
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <div className="flex gap-1.5" role="img" aria-label={`${standing.strikes} of ${standing.limit} strikes`}>
            {Array.from({ length: standing.limit }, (_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${i < standing.strikes ? (standing.suspended ? "bg-[#ff9aab]" : "bg-gold") : "bg-line"}`} />
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {standing.suspended
              ? `Your card can't open the gate. ${standing.nextExpiry ? `The oldest strike expires on ${formatDateTime(standing.nextExpiry)}, then you can park again.` : ""} Contact the parking office if you think this is wrong.`
              : `A confirmed violation is one strike for ${STRIKE_WINDOW_DAYS} days. At ${standing.limit} strikes your card is suspended.`}
          </p>
        </div>
      </Panel>

      <Panel data-enter aria-labelledby="violations-title">
        <PanelHeader id="violations-title" title={open ? `${open} open` : "History"} />
        {mine.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState
              title="No violations"
              action={
                <button type="button" className="c-btn" onClick={() => portal.seedSample(card)}>
                  Load sample violations (demo)
                </button>
              }
            >
              <span className="inline-flex items-center gap-1.5 text-live">
                <ShieldCheck className="size-4" aria-hidden />
                Your card is in good standing.
              </span>
              <br />
              Violations appear here when the gate flags an overstay, overnight parking or a repeat entry.
            </EmptyState>
          </div>
        ) : (
          <ul className="border-t border-line">
            {mine.map((v) => {
              const label = TYPE_LABEL[v.type];
              const status = STATUS_LABEL[v.status];
              const appeal = state.appeals.find((a) => a.violationId === v.id);
              return (
                <li key={v.id} className="border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{label.title}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">{label.detail}</p>
                      <p className="num mt-1 text-xs text-ink-faint">
                        {formatDateTime(v.at)}
                        {v.plate && (
                          <>
                            {" · "}
                            <span className="font-mono">{v.plate}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {v.status === "open" && appealing !== v.id && (
                        <button type="button" className="c-btn c-btn-sm" onClick={() => setAppealing(v.id)}>
                          <MessageSquareText className="size-3.5" aria-hidden />
                          Appeal
                        </button>
                      )}
                    </div>
                  </div>
                  {appeal && (
                    <p className="mt-3 rounded-lg border border-line bg-field/60 px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
                      <span className="font-semibold text-ink">Your appeal:</span> {appeal.note}
                    </p>
                  )}
                  {appealing === v.id && <AppealForm violation={v} onDone={() => setAppealing(null)} />}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
