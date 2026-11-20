"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { describeEvent, eventPhase } from "@/lib/portal/event";
import { portal } from "@/lib/portal/store";
import { useMinute, usePortalState } from "@/lib/portal/usePortal";
import { Badge, Panel, PanelHeader, useToast } from "./ui";

const toInputDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fromInputDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
};
const longDate = (ms: number) => new Date(ms).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });

/**
 * Event mode: plan a big day. On that day some bays on every floor are held back, so the live count,
 * the gate's bay choice and the homepage all adjust. Drivers and the lobby screen are warned a couple
 * of days ahead.
 */
export function EventModePanel() {
  const toast = useToast();
  const { event } = usePortalState();
  const now = useMinute();
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => toInputDate(Date.now()));
  const [reserved, setReserved] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const phase = eventPhase(event, now);
  const planned = !!event && event.date >= new Date(now).setHours(0, 0, 0, 0);

  function start(e: React.FormEvent) {
    e.preventDefault();
    const r = portal.setEvent({ name, date: fromInputDate(date), reservedPerFloor: Number(reserved) || 0 });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast(`${name.trim()} is planned for ${longDate(fromInputDate(date))}.`);
    setName("");
    setReserved("0");
    setError(null);
  }

  return (
    <Panel aria-labelledby="event-title">
      <PanelHeader
        id="event-title"
        title="Event mode"
        aside={phase === "today" ? <Badge tone="gold">On today</Badge> : planned ? <Badge>Planned</Badge> : <Badge>Off</Badge>}
      />
      <div className="border-t border-line px-4 py-4 sm:px-5">
        {planned && event ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-relaxed text-ink-soft">
              <CalendarDays className="mr-1.5 inline size-4 text-gold" aria-hidden />
              <span className="font-semibold text-ink">{event.name}</span> on {longDate(event.date)}.{" "}
              {describeEvent(event) || "No floors or bays are held."}{" "}
              <span className="text-ink-muted">{phase === "today" ? "The holds are in effect now." : "The holds start that morning."}</span>
            </p>
            <button
              type="button"
              className="c-btn c-btn-sm"
              onClick={() => {
                portal.setEvent(null);
                toast("Event cancelled. All bays are back.");
              }}
            >
              Cancel event
            </button>
          </div>
        ) : (
          <form onSubmit={start} noValidate>
            <p className="mb-3 text-sm leading-relaxed text-ink-muted">
              A graduation, a game or an exam day. Close a floor or hold bays for the day, and drivers are warned ahead.
            </p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <div className="min-w-0">
                <label htmlFor="event-name" className="mb-1.5 block text-sm font-semibold text-ink">
                  Event
                </label>
                <input
                  id="event-name"
                  className="c-input w-full"
                  autoComplete="off"
                  placeholder="Graduation"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                />
              </div>
              <div>
                <label htmlFor="event-date" className="mb-1.5 block text-sm font-semibold text-ink">
                  Date
                </label>
                <input id="event-date" type="date" className="c-input w-full" value={date} min={now ? toInputDate(now) : undefined} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="event-reserved" className="mb-1.5 block text-sm font-semibold text-ink">
                  Bays held per open level
                </label>
                <input id="event-reserved" type="number" min={0} max={60} className="c-input w-full sm:w-28" value={reserved} onChange={(e) => setReserved(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="submit" className="c-btn c-btn-gold">
                Plan event
              </button>
              {error && (
                <p role="alert" className="text-[0.8125rem] text-[#ff9aab]">
                  {error}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </Panel>
  );
}
