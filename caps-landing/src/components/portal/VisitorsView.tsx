"use client";

import { useRef, useState } from "react";
import { CalendarDays, Mail, Printer, QrCode } from "lucide-react";
import { Badge, EmptyState, Field, PageHeader, Panel, PanelHeader, useToast } from "@/components/console/ui";
import { useEnter } from "@/hooks/useConsoleMotion";
import { PASS_HORIZON_DAYS, portal } from "@/lib/portal/store";
import { usePortalState } from "@/lib/portal/usePortal";
import type { VisitorPass } from "@/lib/portal/types";
import { QrImage } from "./QrImage";

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
const dateInput = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fromInput = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
};
const longDate = (ms: number) => new Date(ms).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });

function passState(p: VisitorPass, now: number): { label: string; tone: "live" | "gold" | "neutral" | "crimson" } {
  const today = startOfDay(now);
  if (p.usedAt !== undefined) return { label: "Used", tone: "neutral" };
  if (p.date < today) return { label: "Expired", tone: "crimson" };
  if (p.date > today) return { label: "Upcoming", tone: "gold" };
  return { label: "Valid today", tone: "live" };
}

function PassCard({ pass }: { pass: VisitorPass }) {
  const subject = `Parking pass for ${longDate(pass.date)}`;
  const body = [
    `Hello ${pass.guestName},`,
    "",
    `You're registered to park at the University of San Agustin on ${longDate(pass.date)}.`,
    `Show this code to the marshal at the gate: ${pass.code}`,
    `Plate: ${pass.plate}`,
    "",
    "The pass works once and expires at the end of that day.",
  ].join("\n");

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-5 sm:flex-row sm:items-start sm:px-5">
      <QrImage value={pass.code} label={`QR pass for ${pass.guestName}, code ${pass.code}`} />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="font-display text-xl font-semibold text-ink">{pass.guestName}</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          {longDate(pass.date)} · <span className="font-mono">{pass.plate}</span>
        </p>
        <p className="mt-0.5 text-sm text-ink-muted">{pass.purpose}</p>
        <p className="mt-3 font-mono text-[0.9375rem] font-semibold tracking-wide text-ink">{pass.code}</p>
        <p className="mt-1 text-[0.8125rem] text-ink-faint">The marshal scans the code or types it in. It works once and expires at the end of the day.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
          <a className="c-btn c-btn-sm" href={`mailto:${pass.guestEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
            <Mail className="size-3.5" aria-hidden />
            Email to guest
          </a>
          <button type="button" className="c-btn c-btn-sm" onClick={() => window.print()}>
            <Printer className="size-3.5" aria-hidden />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

export function VisitorsView({ card }: { card: string }) {
  const root = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const state = usePortalState();
  const [now] = useState(() => Date.now());
  const today = startOfDay(now);
  const [form, setForm] = useState({ guestName: "", guestEmail: "", plate: "", date: dateInput(today), purpose: "" });
  const [error, setError] = useState<string | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  useEnter(root);

  const mine = state.passes.filter((p) => p.hostCard === card).sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
  const shown = mine.find((p) => p.id === shownId) ?? null;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = portal.createPass(card, { guestName: form.guestName, plate: form.plate, date: fromInput(form.date), purpose: form.purpose, guestEmail: form.guestEmail });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setShownId(r.pass.id);
    setForm({ guestName: "", guestEmail: "", plate: "", date: dateInput(today), purpose: "" });
    toast(`Pass ready for ${r.pass.guestName}.`);
  }

  return (
    <div ref={root} className="space-y-5">
      <PageHeader
        title="Visitor passes"
        description="Register a guest ahead of time. They get a one-day QR pass, so the marshal doesn't have to log them by hand."
      />

      <Panel data-enter aria-labelledby="new-pass-title">
        <PanelHeader id="new-pass-title" title="New pass" />
        <form onSubmit={submit} noValidate className="border-t border-line px-4 py-4 sm:px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guest's full name" htmlFor="g-name">
              <input id="g-name" className="c-input w-full" autoComplete="off" value={form.guestName} onChange={(e) => set("guestName", e.target.value)} />
            </Field>
            <Field label="Guest's email (optional)" htmlFor="g-email" hint="The Email button then opens a message to them.">
              <input id="g-email" type="email" className="c-input w-full" autoComplete="off" value={form.guestEmail} onChange={(e) => set("guestEmail", e.target.value)} />
            </Field>
            <Field label="Plate number" htmlFor="g-plate">
              <input id="g-plate" className="c-input w-full font-mono uppercase" autoComplete="off" spellCheck={false} value={form.plate} onChange={(e) => set("plate", e.target.value)} />
            </Field>
            <Field label="Visit date" htmlFor="g-date" hint={`Up to ${PASS_HORIZON_DAYS} days ahead.`}>
              <input
                id="g-date"
                type="date"
                className="c-input w-full"
                min={dateInput(today)}
                max={dateInput(today + PASS_HORIZON_DAYS * DAY)}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </Field>
            <Field label="Purpose of visit" htmlFor="g-purpose">
              <input id="g-purpose" className="c-input w-full" autoComplete="off" placeholder="Thesis defense, meeting, delivery…" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} />
            </Field>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-[0.8125rem] text-[#ff9aab]">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <button type="submit" className="c-btn c-btn-gold">
              <QrCode className="size-4" aria-hidden />
              Create pass
            </button>
          </div>
        </form>
      </Panel>

      {shown && (
        <Panel data-enter aria-labelledby="shown-title" className="print:border-0">
          <PanelHeader id="shown-title" title="QR pass" />
          <div className="border-t border-line">
            <PassCard pass={shown} />
          </div>
        </Panel>
      )}

      <Panel data-enter aria-labelledby="passes-title">
        <PanelHeader id="passes-title" title={`Your guests (${mine.length})`} />
        {mine.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState title="No passes yet">Register a guest above and their pass appears here.</EmptyState>
          </div>
        ) : (
          <ul className="border-t border-line">
            {mine.map((p) => {
              const s = passState(p, now);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-ink-soft">
                    <CalendarDays className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {p.guestName}
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </p>
                    <p className="text-sm text-ink-muted">
                      {longDate(p.date)} · <span className="font-mono">{p.plate}</span> · {p.purpose}
                    </p>
                  </div>
                  <button type="button" className="c-btn c-btn-sm" onClick={() => setShownId(p.id)} aria-label={`Show QR pass for ${p.guestName}`}>
                    <QrCode className="size-3.5" aria-hidden />
                    Show QR
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
