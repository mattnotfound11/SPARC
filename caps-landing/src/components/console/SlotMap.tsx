"use client";

import { useRef } from "react";
import { Car, Clock } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Slot, SlotStatus } from "@/lib/sparc/types";
import { VEHICLE_LABEL } from "@/lib/sparc/selectors";
import { VehicleBadge } from "./ui";

gsap.registerPlugin(useGSAP);

const STATUS_LABEL: Record<SlotStatus, string> = { free: "Free", reserved: "Reserved", occupied: "Occupied" };
const ROW = 6; // two blocks of three, with an aisle between

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function Cell({
  slot,
  selected,
  onSelect,
}: {
  slot: Slot;
  selected: boolean;
  onSelect?: (code: string) => void;
}) {
  const body = (
    <>
      <span>{slot.code}</span>
      {slot.status === "occupied" && <Car className="size-3.5" strokeWidth={2} aria-hidden />}
      {slot.status === "reserved" && <Clock className="size-3.5" strokeWidth={2} aria-hidden />}
    </>
  );
  const label = `Slot ${slot.code}, ${STATUS_LABEL[slot.status].toLowerCase()}`;

  if (!onSelect) {
    return (
      <div className="slot-cell" data-status={slot.status} role="img" aria-label={label}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="slot-cell"
      data-status={slot.status}
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect(slot.code)}
    >
      {body}
    </button>
  );
}

/**
 * The cinema-style slot map from the kiosk: the gate is the "screen", slots are the seats.
 * Pass `onSelect` to make slots selectable; omit it for a read-only driver view.
 */
export function SlotMap({
  slots,
  floor,
  selectedCode,
  onSelect,
}: {
  slots: Slot[];
  floor: number;
  selectedCode?: string | null;
  onSelect?: (code: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const mine = slots.filter((s) => s.floor === floor);
  const vehicle = mine[0]?.vehicle ?? "light";
  const counts = {
    free: mine.filter((s) => s.status === "free").length,
    reserved: mine.filter((s) => s.status === "reserved").length,
    occupied: mine.filter((s) => s.status === "occupied").length,
  };

  // Seats pop in when the floor changes
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".slot-cell", {
          opacity: 0,
          y: 10,
          scale: 0.92,
          duration: 0.5,
          ease: "power3.out",
          stagger: { each: 0.012, from: "start" },
          clearProps: "opacity,transform",
        });
        gsap.from("[data-gate]", { scaleX: 0.4, opacity: 0, duration: 0.7, ease: "power3.out", clearProps: "opacity,transform" });
      });
    },
    { scope: root, dependencies: [floor], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <h3 className="font-display text-lg font-semibold text-ink">Floor {floor}</h3>
          <VehicleBadge vehicle={vehicle} />
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-muted" aria-label="Legend">
          {(["free", "reserved", "occupied"] as const).map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="slot-cell !size-4 !h-4 !flex-none !rounded-[5px]"
                data-status={s}
                style={{ transition: "none" }}
              />
              <span className="num">
                {counts[s]} {STATUS_LABEL[s].toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto mt-5 max-w-[34rem]">
        <div data-gate className="mx-auto mb-1 w-4/5 origin-center">
          <div className="h-3 rounded-t-[50%] border-t-2 border-gold/55" />
        </div>
        <p className="mb-5 text-center text-xs font-medium text-ink-faint">Gate and kiosk · {VEHICLE_LABEL[vehicle]} floor</p>

        <div className="space-y-2.5">
          {chunk(mine, ROW).map((row, r) => (
            <div key={r} className="flex items-center gap-2">
              {[row.slice(0, ROW / 2), row.slice(ROW / 2)].map((block, b) => (
                <div key={b} className={`flex flex-1 gap-2 ${b === 1 ? "order-3" : ""}`}>
                  {block.map((s) => (
                    <Cell key={s.code} slot={s} selected={selectedCode === s.code} onSelect={onSelect} />
                  ))}
                  {/* a short last row keeps its seats the same width as the rows above */}
                  {Array.from({ length: ROW / 2 - block.length }, (_, i) => (
                    <div key={`pad-${i}`} aria-hidden className="flex-1" />
                  ))}
                </div>
              ))}
              <div aria-hidden className="order-2 w-3 shrink-0 sm:w-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
