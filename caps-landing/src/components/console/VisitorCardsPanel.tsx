"use client";

import { useState } from "react";
import { IdCard } from "lucide-react";
import { useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import { Badge, EmptyState, Panel, PanelHeader, useToast } from "./ui";

/**
 * Visitor NFC cards. The office registers each card once; its built-in role is Visitor, so a tap at
 * Entry / Exit shows "Visitor", needs no semester pass, and can be reused by the next visitor.
 */
export function VisitorCardsPanel() {
  const store = useSparcStore();
  const state = useSparcState();
  const toast = useToast();
  const [card, setCard] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cards = state.users.filter((u) => u.role === "visitor");
  const inside = new Set(state.slots.map((s) => s.occupant?.userId).filter(Boolean));

  function add(e: React.FormEvent) {
    e.preventDefault();
    const res = store.addVisitorCard(card, label);
    if (!res.ok) return setError(res.error);
    setError(null);
    setCard("");
    setLabel("");
    toast("Visitor card registered.");
  }

  function remove(id: string, name: string) {
    const res = store.removeUser(id);
    if (!res.ok) return toast(res.error);
    toast(`${name} removed.`);
  }

  return (
    <Panel aria-labelledby="visitor-cards-title">
      <PanelHeader
        id="visitor-cards-title"
        title="Visitor cards"
        aside={<span className="text-sm text-ink-muted">{cards.length} registered</span>}
      />
      <form onSubmit={add} noValidate className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:px-5">
        <div>
          <label htmlFor="vc-card" className="mb-1.5 block text-xs font-semibold text-ink-soft">Card number</label>
          <input
            id="vc-card"
            value={card}
            onChange={(e) => setCard(e.target.value)}
            placeholder="0000-0000-0001"
            className="c-input min-h-11 w-full font-mono"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "vc-err" : undefined}
          />
        </div>
        <div>
          <label htmlFor="vc-label" className="mb-1.5 block text-xs font-semibold text-ink-soft">Name on the card (optional)</label>
          <input id="vc-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Visitor 01" className="c-input min-h-11 w-full" autoComplete="off" />
        </div>
        <button type="submit" className="c-btn c-btn-gold min-h-11" disabled={!card.trim()}>
          <IdCard className="size-4" aria-hidden />
          Register card
        </button>
        {error && <p id="vc-err" role="alert" className="text-sm text-crimson sm:col-span-3">{error}</p>}
      </form>

      {cards.length === 0 ? (
        <EmptyState title="No visitor cards yet">Register the cards you hand to visitors. A tap then shows &ldquo;Visitor&rdquo; at the gate.</EmptyState>
      ) : (
        <ul className="border-t border-line">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                <p className="truncate font-mono text-xs text-ink-muted">{c.nfcId}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={inside.has(c.id) ? "live" : "neutral"}>{inside.has(c.id) ? "Inside" : "Available"}</Badge>
                <button type="button" className="c-btn c-btn-sm" onClick={() => remove(c.id, c.name)} disabled={inside.has(c.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
