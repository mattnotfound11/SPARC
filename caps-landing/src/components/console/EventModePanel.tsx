"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { portal } from "@/lib/portal/store";
import { useMinute, usePortalState } from "@/lib/portal/usePortal";
import { Badge, Panel, PanelHeader, useToast } from "./ui";

/** Event mode: the marshal flags a big day. Drivers see a banner in their portal and on the lobby screen. */
export function EventModePanel() {
  const toast = useToast();
  const { event } = usePortalState();
  const now = useMinute();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const on = !!event && event.until > now;

  function start(e: React.FormEvent) {
    e.preventDefault();
    const r = portal.setEvent(name);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast(`Event mode is on for ${name.trim()}.`);
    setName("");
    setError(null);
  }

  return (
    <Panel aria-labelledby="event-title">
      <PanelHeader id="event-title" title="Event mode" aside={on ? <Badge tone="gold">On</Badge> : <Badge>Off</Badge>} />
      <div className="border-t border-line px-4 py-4 sm:px-5">
        {on ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-relaxed text-ink-soft">
              <CalendarDays className="mr-1.5 inline size-4 text-gold" aria-hidden />
              <span className="font-semibold text-ink">{event!.name}</span> is flagged until midnight. Drivers and the lobby screen show a warning.
            </p>
            <button
              type="button"
              className="c-btn c-btn-sm"
              onClick={() => {
                portal.setEvent(null);
                toast("Event mode is off.");
              }}
            >
              Turn off
            </button>
          </div>
        ) : (
          <form onSubmit={start} noValidate>
            <p className="mb-3 text-sm leading-relaxed text-ink-muted">A graduation, a game or an exam day: warn drivers that parking will fill early.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-56">
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
              <button type="submit" className="c-btn c-btn-gold">
                Turn on for today
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-[0.8125rem] text-[#ff9aab]">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </Panel>
  );
}
