"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftFromLine, ArrowRightToLine, BellOff, ExternalLink, ShieldAlert, UserPlus } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEnter } from "@/hooks/useConsoleMotion";
import { useReveal } from "@/hooks/useReveal";
import { useNow, useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import {
  buildingTotals,
  dayRanges,
  dayReport,
  floorStats,
  formatDateTime,
  formatDuration,
  timeAgo,
} from "@/lib/sparc/selectors";
import type { LogEntry } from "@/lib/sparc/types";
import { FloorList } from "./FloorList";
import { SlotMap } from "./SlotMap";
import { Badge, Count, EmptyState, PageHeader, Panel, PanelHeader } from "./ui";

/** Scroll-reveal wrapper for panels below the fold, same pattern as the landing page. */
function RevealPanel({ delay = 0, className = "", children }: { delay?: number; className?: string; children: React.ReactNode }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "in" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ── Building occupancy ───────────────────────────────────── */
function BuildingPanel() {
  const state = useSparcState();
  const totals = buildingTotals(floorStats(state.config, state.slots));
  const pct = (n: number) => (totals.total ? (n / totals.total) * 100 : 0);

  return (
    <Panel aria-labelledby="building-title" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="building-title" className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
          Available in the building
        </h2>
        <p className="font-display text-[2.5rem] leading-none font-semibold tracking-tight text-ink">
          <Count value={totals.free} />
          <span className="text-lg font-normal text-ink-faint"> / {totals.total} slots</span>
        </p>
      </div>

      <div
        className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/[0.06]"
        role="img"
        aria-label={`${totals.free} free, ${totals.reserved} reserved, ${totals.occupied} occupied of ${totals.total} slots`}
      >
        {[
          { n: totals.occupied, cls: "bg-white/35" },
          { n: totals.reserved, cls: "bg-gold" },
          { n: totals.free, cls: "bg-live" },
        ].map(({ n, cls }, i) => (
          <div
            key={i}
            className={cls}
            style={{ width: `${pct(n)}%`, transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        ))}
      </div>

      <dl className="mt-3.5 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
        {[
          { label: "Occupied", n: totals.occupied, cls: "bg-white/35" },
          { label: "Reserved", n: totals.reserved, cls: "bg-gold" },
          { label: "Free", n: totals.free, cls: "bg-live" },
        ].map(({ label, n, cls }) => (
          <div key={label} className="flex items-center gap-2">
            <span aria-hidden className={`size-2.5 rounded-[3px] ${cls}`} />
            <dt className="text-ink-muted">{label}</dt>
            <dd className="num font-semibold text-ink">{n}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* ── Today ────────────────────────────────────────────────── */
function TodayPanel() {
  const state = useSparcState();
  const report = useMemo(() => dayReport(state, dayRanges(state.now)[0]), [state]);

  const rows = [
    { label: "Entries", value: String(report.entries) },
    { label: "Exits", value: String(report.exits) },
    { label: "Denied taps", value: String(report.denied) },
    { label: "Average stay", value: formatDuration(report.avgStayMin) },
  ];
  return (
    <Panel aria-labelledby="today-title" className="p-4 sm:p-5">
      <h2 id="today-title" className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
        Today at the gate
      </h2>
      <dl className="mt-3 divide-y divide-line text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-2">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="num font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* ── Floors + slot map ────────────────────────────────────── */
function FloorExplorer() {
  const state = useSparcState();
  const stats = floorStats(state.config, state.slots);
  const [floor, setFloor] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const now = useNow(30000);

  const slot = selected ? state.slots.find((s) => s.code === selected) : undefined;
  const occ = slot?.occupant;

  function pickFloor(f: number) {
    setFloor(f);
    setSelected(null);
  }

  return (
    <Panel aria-labelledby="floors-title">
      <PanelHeader
        id="floors-title"
        title="Floors and slot map"
        aside={
          <Link href="/slots" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-gold">
            Driver view <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        }
      />
      <div className="grid gap-5 px-4 pb-5 sm:px-5 lg:grid-cols-[17rem_1fr] lg:gap-7">
        <FloorList stats={stats} selected={floor} onSelect={pickFloor} />

        <div className="min-w-0">
          <SlotMap slots={state.slots} floor={floor} selectedCode={selected} onSelect={(c) => setSelected((cur) => (cur === c ? null : c))} />

          <div className="mx-auto mt-5 max-w-[34rem] rounded-xl border border-line bg-field/70 px-4 py-3 text-sm" aria-live="polite">
            {!slot ? (
              <p className="text-ink-muted">Select a slot to see who is parked there.</p>
            ) : slot.status === "free" ? (
              <p className="text-ink-soft">
                <span className="font-semibold text-ink">{slot.code}</span> is free.
              </p>
            ) : occ ? (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">{slot.code}</span> ·{" "}
                  {slot.status === "reserved" ? "Reserved for" : "Occupied by"} {occ.name}
                </p>
                <p className="num text-ink-muted">
                  {occ.plate} · {slot.status === "reserved" ? "arriving" : formatDuration((now - occ.since) / 60000)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── Invalid ID alerts ────────────────────────────────────── */
function AlertsPanel() {
  const state = useSparcState();
  const store = useSparcStore();
  const now = useNow(15000);
  const open = state.alerts.filter((a) => !a.acknowledged);

  return (
    <Panel aria-labelledby="alerts-title">
      <PanelHeader
        id="alerts-title"
        title="Invalid ID alerts"
        aside={
          open.length > 0 ? (
            <button type="button" onClick={() => store.acknowledgeAllAlerts()} className="text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-gold">
              Acknowledge all
            </button>
          ) : undefined
        }
      />
      {open.length === 0 ? (
        <div className="flex items-start gap-3 px-4 pb-5 sm:px-5">
          <BellOff className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
          <p className="text-sm leading-relaxed text-ink-muted">
            Nothing waiting. When a card that isn&apos;t registered is tapped at the gate, it shows up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {open.slice(0, 5).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ShieldAlert className="size-4 shrink-0 text-crimson" aria-hidden />
                  <span className="font-mono text-[0.8125rem]">{a.nfcId}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">Unregistered card · {timeAgo(a.at, now)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/admin/users?nfc=${encodeURIComponent(a.nfcId)}`}
                  className="c-btn c-btn-sm"
                  aria-label={`Register card ${a.nfcId}`}
                >
                  <UserPlus className="size-3.5" aria-hidden />
                  Register
                </Link>
                <button type="button" className="c-btn c-btn-sm" onClick={() => store.acknowledgeAlert(a.id)} aria-label={`Dismiss alert for ${a.nfcId}`}>
                  Dismiss
                </button>
              </div>
            </li>
          ))}
          {open.length > 5 && <li className="px-4 py-2.5 text-xs text-ink-muted sm:px-5">+ {open.length - 5} more</li>}
        </ul>
      )}
    </Panel>
  );
}

/* ── Recent activity ──────────────────────────────────────── */
function describe(l: LogEntry) {
  if (l.event === "entry") return { icon: ArrowRightToLine, tone: "text-live", text: `${l.userName} entered`, where: l.slot };
  if (l.event === "exit") return { icon: ArrowLeftFromLine, tone: "text-ink-soft", text: `${l.userName} left`, where: l.slot };
  return { icon: ShieldAlert, tone: "text-crimson", text: l.userName ? `${l.userName} denied` : "Unknown card denied", where: l.reason ?? null };
}

function ActivityFeed() {
  const state = useSparcState();
  const now = useNow(15000);
  const list = useRef<HTMLUListElement>(null);
  const recent = state.logs.slice(0, 8);
  const newest = recent[0]?.id;
  const first = useRef(true);

  // The newest row slides in from the top
  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("li:first-child", { opacity: 0, y: -14, duration: 0.55, ease: "power3.out", clearProps: "opacity,transform" });
      });
    },
    { scope: list, dependencies: [newest] },
  );

  return (
    <Panel aria-labelledby="activity-title">
      <PanelHeader
        id="activity-title"
        title="Recent activity"
        aside={
          <Link href="/admin/logs" className="text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-gold">
            Open log
          </Link>
        }
      />
      {recent.length === 0 ? (
        <EmptyState title="No gate activity yet">Entries, exits and denied taps appear here as they happen.</EmptyState>
      ) : (
        <ul ref={list} className="border-t border-line">
          {recent.map((l) => {
            const d = describe(l);
            const Icon = d.icon;
            return (
              <li key={l.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 sm:px-5">
                <Icon className={`size-4 shrink-0 ${d.tone}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{d.text}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {l.event === "denied" ? d.where : <>Slot <span className="font-mono">{d.where}</span></>} · {timeAgo(l.at, now)}
                  </p>
                </div>
                {l.event === "denied" && <Badge tone="crimson">Denied</Badge>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="sr-only">Last updated {formatDateTime(state.now)}</p>
    </Panel>
  );
}

export function LiveStatusView() {
  const root = useRef<HTMLDivElement>(null);
  const state = useSparcState();
  const total = state.slots.length;
  useEnter(root);

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Live status"
        description={`New parking building · ${state.config.length} floors · ${total} slots. Updates every few seconds from the simulated gate feed.`}
      />

      <div data-enter className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <BuildingPanel />
        <TodayPanel />
      </div>

      <div data-enter className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-6">
        <FloorExplorer />
        <div className="space-y-5 lg:space-y-6">
          <AlertsPanel />
          <RevealPanel delay={80}>
            <ActivityFeed />
          </RevealPanel>
        </div>
      </div>
    </div>
  );
}
