"use client";

import { useEffect, useRef } from "react";
import { BellOff } from "lucide-react";
import { Badge, EmptyState, PageHeader, Panel, PanelHeader } from "@/components/console/ui";
import { useEnter } from "@/hooks/useConsoleMotion";
import { markAlertsSeen, useAlerts } from "@/lib/portal/useAlerts";
import { formatDateTime } from "@/lib/sparc/selectors";

export function AlertsView({ card }: { card: string }) {
  const root = useRef<HTMLDivElement>(null);
  const { notices, seen } = useAlerts(card);
  // New ones are highlighted for a few seconds, then count as read
  const cutoff = seen;
  useEnter(root);

  useEffect(() => {
    const t = window.setTimeout(() => markAlertsSeen(card), 4000);
    return () => window.clearTimeout(t);
  }, [card]);

  return (
    <div ref={root} className="space-y-5">
      <PageHeader title="Alerts" description="Violations, appeal results, strikes, visitors arriving and free bays on your waitlist." />
      <Panel data-enter aria-labelledby="alerts-title">
        <PanelHeader id="alerts-title" title={notices.length ? "Latest" : "Nothing yet"} />
        {notices.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState title="No alerts">
              <span className="inline-flex items-center gap-1.5">
                <BellOff className="size-4" aria-hidden />
                You&apos;re all caught up.
              </span>
            </EmptyState>
          </div>
        ) : (
          <ul className="border-t border-line">
            {notices.map((n) => (
              <li key={n.id} className="flex items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5">
                <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${n.at > cutoff ? "bg-gold" : "bg-line"}`} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {n.title}
                    {n.at > cutoff && <Badge tone="gold">New</Badge>}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">{n.body}</p>
                  <p className="num mt-1 text-xs text-ink-faint">{formatDateTime(n.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
