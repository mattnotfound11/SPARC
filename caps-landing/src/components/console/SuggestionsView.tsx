"use client";

import { useCallback, useEffect, useState } from "react";
import { listAllSuggestions, setSuggestionStatus, type Suggestion, type SuggestionStatus } from "@/lib/member/data";
import { formatDateTime } from "@/lib/sparc/selectors";
import { Badge, EmptyState, PageHeader, Panel, PanelHeader, useToast } from "./ui";

const STATUSES: { value: SuggestionStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "resolved", label: "Resolved" },
];

/** Administrator inbox for members' one-way suggestions. */
export function SuggestionsView() {
  const toast = useToast();
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    listAllSuggestions().then(
      (rows) => {
        setItems(rows);
        setFailed(false);
      },
      () => setFailed(true),
    );
  }, []);
  useEffect(load, [load]);

  async function change(id: string, status: SuggestionStatus) {
    const failure = await setSuggestionStatus(id, status);
    if (failure) toast(failure, "error");
    else setItems((rows) => rows?.map((r) => (r.id === id ? { ...r, status } : r)) ?? rows);
  }

  const unread = items?.filter((s) => s.status === "new").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Suggestions" description="Ideas and recommendations sent by members. They can't see replies, so use this as an inbox." />
      <Panel aria-labelledby="inbox-h">
        <PanelHeader id="inbox-h" title="Inbox" aside={unread ? <Badge tone="gold">{unread} new</Badge> : undefined} />
        {failed ? (
          <p role="alert" className="px-5 pb-5 text-crimson">Couldn&apos;t load suggestions. <button className="underline" onClick={load}>Try again</button></p>
        ) : items === null ? (
          <p className="px-5 pb-5 text-ink-muted" role="status">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState title="No suggestions yet">When a member sends one from their dashboard, it shows up here.</EmptyState>
        ) : (
          <ul>
            {items.map((s) => (
              <li key={s.id} className="border-t border-line px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-semibold text-ink">{s.userName}</span>
                    <span className="text-ink-muted"> · {s.category} · {formatDateTime(s.createdAt)}</span>
                  </p>
                  <label className="flex items-center gap-2 text-xs text-ink-muted">
                    Status
                    <select className="c-input !h-8 !py-0 text-sm" value={s.status} onChange={(e) => change(s.id, e.target.value as SuggestionStatus)}>
                      {STATUSES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{s.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
