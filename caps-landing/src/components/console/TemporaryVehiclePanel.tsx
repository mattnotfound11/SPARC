"use client";

import { useState } from "react";
import { CarFront } from "lucide-react";
import { portal } from "@/lib/portal/store";
import { usePortalState } from "@/lib/portal/usePortal";
import { useSparcState } from "@/lib/sparc/SparcProvider";
import { cardKey } from "@/lib/sparc/store";
import { Badge, Panel, PanelHeader, useToast } from "./ui";

/**
 * For a driver who turns up in a different car (a borrowed or rental one): the marshal adds it to their
 * card for today. It lapses at midnight, and the driver sees it as their active vehicle in the portal.
 */
export function TemporaryVehiclePanel() {
  const toast = useToast();
  const { users } = useSparcState();
  const { vehicles } = usePortalState();
  const [card, setCard] = useState("");
  const [plate, setPlate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const key = cardKey(card);
  const driver = key ? users.find((u) => cardKey(u.nfcId) === key) : undefined;
  const today = new Date().setHours(0, 0, 0, 0);
  const addedToday = vehicles.filter((v) => v.kind === "temporary" && v.createdAt >= today).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!driver) {
      setError(key ? "That card isn't registered to anyone. Check the number." : "Enter the driver's card number.");
      return;
    }
    const r = portal.addTemporary(key, { plate });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast(`${plate.trim().toUpperCase()} added for ${driver.name} until midnight.`);
    setPlate("");
    setError(null);
  }

  return (
    <Panel data-enter aria-labelledby="temp-title">
      <PanelHeader id="temp-title" title="Add a temporary vehicle" />
      <form onSubmit={submit} noValidate className="border-t border-line px-4 py-4 sm:px-5">
        <p className="mb-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          For a driver in a borrowed or rental car. The vehicle is linked to their card and lapses at midnight.
        </p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label htmlFor="temp-card" className="mb-1.5 block text-sm font-semibold text-ink">
              Card number
            </label>
            <input
              id="temp-card"
              className="c-input w-full font-mono"
              inputMode="numeric"
              autoComplete="off"
              placeholder="4000-0000-1001"
              value={card}
              onChange={(e) => {
                setCard(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div>
            <label htmlFor="temp-plate" className="mb-1.5 block text-sm font-semibold text-ink">
              Plate
            </label>
            <input
              id="temp-plate"
              className="c-input w-full font-mono uppercase"
              autoComplete="off"
              placeholder="ABC 1234"
              value={plate}
              onChange={(e) => {
                setPlate(e.target.value);
                setError(null);
              }}
            />
          </div>
          <button type="submit" className="c-btn c-btn-gold">
            <CarFront className="size-4" aria-hidden />
            Add vehicle
          </button>
        </div>
        <p className="mt-2 min-h-5 text-[0.8125rem]" role={error ? "alert" : undefined}>
          {error ? (
            <span className="text-[#ff9aab]">{error}</span>
          ) : driver ? (
            <span className="text-live">
              {driver.name}, card ending {key.slice(-4)}
            </span>
          ) : null}
        </p>
        {addedToday.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-line pt-3 text-sm text-ink-soft">
            {addedToday.map((v) => {
              const owner = users.find((u) => cardKey(u.nfcId) === v.ownerCard);
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{v.plate}</span>
                  <span className="text-ink-muted">{owner?.name ?? `card ending ${v.ownerCard.slice(-4)}`}</span>
                  <Badge tone="gold">Until midnight</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </form>
    </Panel>
  );
}
