"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, LoaderCircle, Maximize, Minus, Plus } from "lucide-react";
import { useNow, useSparcState } from "@/lib/sparc/SparcProvider";
import { VEHICLE_LABEL, floorStats, formatDuration } from "@/lib/sparc/selectors";
import type { Slot, SlotStatus } from "@/lib/sparc/types";
import { FloorList } from "./FloorList";
import type { ParkingScene, ParkingTarget } from "./parkingScene";
import { SlotMap } from "./SlotMap";
import { Badge, Panel, PanelHeader, VehicleBadge } from "./ui";

const STATUS_LABEL: Record<SlotStatus, string> = { free: "free", occupied: "occupied" };
const stageButton = "grid size-10 place-items-center rounded-lg border border-line-strong bg-canvas/80 text-ink-soft backdrop-blur transition-colors hover:border-gold/50 hover:text-ink";

function describeSlot(slot: Slot) {
  if (slot.status === "free") return `Slot ${slot.code}, free`;
  const who = slot.occupant ? ` by ${slot.occupant.name}` : "";
  return `Slot ${slot.code}, ${STATUS_LABEL[slot.status]}${who}`;
}

export function ParkingExplorer() {
  const state = useSparcState();
  const now = useNow(30000);
  const stats = useMemo(() => floorStats(state.config, state.slots), [state.config, state.slots]);

  const host = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const scene = useRef<ParkingScene | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unsupported">("loading");
  const [floor, setFloor] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<ParkingTarget | null>(null);
  const [fallbackFloor, setFallbackFloor] = useState(1);

  function openFloor(next: number | null) {
    setFloor(next);
    setSelected(null);
    setHover(null);
  }

  useEffect(() => {
    let cancelled = false;
    let created: ParkingScene | null = null;
    import("./parkingScene")
      .then(({ createParkingScene }) => {
        if (cancelled || !host.current) return;
        created = createParkingScene(host.current, {
          onHover(target, x, y) {
            setHover((current) => (JSON.stringify(current) === JSON.stringify(target) ? current : target));
            const el = tip.current;
            if (!el || !target) return;
            const left = Math.min(Math.max(x, 100), el.parentElement!.clientWidth - 100);
            el.style.transform = `translate(${left}px, ${Math.max(y, 64)}px) translate(-50%, calc(-100% - 14px))`;
          },
          onSelectFloor: (next) => {
            setFloor(next);
            setSelected(null);
            setHover(null);
          },
          onSelectSlot: (code) => setSelected((current) => (code === null || current === code ? null : code)),
        });
        scene.current = created;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unsupported");
      });
    return () => {
      cancelled = true;
      created?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    if (status === "ready") scene.current?.setData(state.config, state.slots);
  }, [status, state.config, state.slots]);
  useEffect(() => {
    if (status === "ready") scene.current?.setFloor(floor);
  }, [status, floor]);
  useEffect(() => {
    if (status === "ready") scene.current?.setSelected(selected);
  }, [status, selected, floor]);

  const header = (
    <PanelHeader
      id="floors-title"
      title="Floors and slot map"
      aside={
        <Link href="/slots" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-gold">
          Driver view <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      }
    />
  );

  if (status === "unsupported") {
    return (
      <Panel aria-labelledby="floors-title">
        {header}
        <p className="px-4 pb-4 text-sm text-ink-muted sm:px-5">This browser can&apos;t show the 3D building, so here is the flat map.</p>
        <div className="grid gap-5 px-4 pb-5 sm:px-5 lg:grid-cols-[17rem_1fr] lg:gap-7">
          <FloorList stats={stats} selected={fallbackFloor} onSelect={setFallbackFloor} />
          <SlotMap slots={state.slots} floor={fallbackFloor} />
        </div>
      </Panel>
    );
  }

  const currentStat = stats.find((f) => f.floor === floor) ?? null;
  const visibleSlots = floor === null ? state.slots : state.slots.filter((s) => s.floor === floor);
  const counts = {
    free: visibleSlots.filter((s) => s.status === "free").length,
    occupied: visibleSlots.filter((s) => s.status === "occupied").length,
  };
  const slot = selected ? state.slots.find((s) => s.code === selected) : undefined;
  const occupant = slot?.occupant;
  const hoverSlot = hover?.kind === "slot" ? state.slots.find((s) => s.code === hover.code) : undefined;
  const hoverFloor = hover?.kind === "floor" ? stats.find((f) => f.floor === hover.floor) : undefined;
  const floorSlots = floor === null ? [] : [...visibleSlots].sort((a, b) => a.index - b.index);

  return (
    <Panel aria-labelledby="floors-title">
      {header}

      <div
        className="relative h-[clamp(26rem,64vh,44rem)] overflow-hidden border-y border-line bg-field"
        onKeyDown={(e) => {
          if (e.key === "Escape" && floor !== null) openFloor(null);
        }}
      >
        <div ref={host} className="absolute inset-0" aria-hidden />

        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center text-sm text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Loading the building
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute top-3 left-3 max-w-[calc(100%-6rem)] sm:top-4 sm:left-4">
          {currentStat ? (
            <div className="pointer-events-auto flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => openFloor(null)} aria-label="Back to the whole building" className={`${stageButton} !flex !w-auto items-center gap-1.5 px-3 text-[0.8125rem] font-semibold`}>
                <ArrowLeft className="size-4" aria-hidden />
                <span className="hidden sm:inline">Whole building</span>
              </button>
              <h3 className="font-display text-lg font-semibold text-ink">Floor {currentStat.floor}</h3>
              <VehicleBadge vehicle={currentStat.vehicle} />
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Select a floor to go inside. Drag to turn the building.</p>
          )}
        </div>

        <div className="absolute bottom-3 left-3 flex gap-1.5 sm:bottom-4 sm:left-4">
          <button type="button" className={stageButton} onClick={() => scene.current?.zoom(0.78)} aria-label="Zoom in">
            <Plus className="size-4" aria-hidden />
          </button>
          <button type="button" className={stageButton} onClick={() => scene.current?.zoom(1.28)} aria-label="Zoom out">
            <Minus className="size-4" aria-hidden />
          </button>
          <button type="button" className={stageButton} onClick={() => scene.current?.resetView()} aria-label="Reset the view">
            <Maximize className="size-4" aria-hidden />
          </button>
        </div>

        <div
          ref={tip}
          aria-hidden
          className={`pointer-events-none absolute top-0 left-0 rounded-lg border border-line-strong bg-surface-raised/95 px-3 py-2 text-[0.8125rem] whitespace-nowrap shadow-xl transition-opacity duration-150 ${
            hoverSlot || (hoverFloor && floor === null) ? "opacity-100" : "opacity-0"
          }`}
        >
          {hoverFloor && (
            <>
              <p className="font-semibold text-ink">Floor {hoverFloor.floor}</p>
              <p className="text-ink-muted">
                {hoverFloor.free} of {hoverFloor.total} free, {VEHICLE_LABEL[hoverFloor.vehicle]}
              </p>
            </>
          )}
          {hoverSlot && (
            <>
              <p className="font-semibold text-ink">
                {hoverSlot.code}, {STATUS_LABEL[hoverSlot.status]}
              </p>
              {hoverSlot.occupant && <p className="text-ink-muted">{hoverSlot.occupant.name}</p>}
            </>
          )}
        </div>

        {floorSlots.length > 0 && (
          <div role="group" aria-label={`Slots on floor ${floor}`} className="sr-only">
            {floorSlots.map((s) => (
              <button
                key={s.code}
                type="button"
                aria-pressed={selected === s.code}
                aria-label={describeSlot(s)}
                onFocus={() => scene.current?.highlight(s.code)}
                onBlur={() => scene.current?.highlight(null)}
                onClick={() => setSelected((current) => (current === s.code ? null : s.code))}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 sm:px-5">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-muted" aria-label="Legend">
          {(["free", "occupied"] as const).map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span aria-hidden className="slot-cell !size-4 !h-4 !flex-none !rounded-[5px]" data-status={s} style={{ transition: "none" }} />
              <span className="num">
                {counts[s]} {STATUS_LABEL[s]}
              </span>
            </li>
          ))}
        </ul>

        <div className="min-h-5 text-sm" aria-live="polite">
          {floor === null ? null : !slot ? (
            <p className="text-ink-muted">Select a slot to see who is parked there.</p>
          ) : slot.status === "free" ? (
            <p className="text-ink-soft">
              <span className="font-semibold text-ink">{slot.code}</span> is free.
            </p>
          ) : occupant ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
              <Badge>Occupied</Badge>
              <span>
                <span className="font-semibold text-ink">{slot.code}</span> {occupant.name}
              </span>
              <span className="num text-ink-muted">
                {occupant.plate}, parked {formatDuration((now - occupant.since) / 60000)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
