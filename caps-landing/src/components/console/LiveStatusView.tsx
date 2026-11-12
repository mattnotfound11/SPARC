"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeftFromLine, ArrowRightToLine, CalendarClock, RotateCw } from "lucide-react";
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
  formatDate,
  formatDateTime,
  isExpired,
  timeAgo,
} from "@/lib/sparc/selectors";
import type { LogEntry } from "@/lib/sparc/types";
import { ParkingTowers } from "./ParkingTowers";
import { Count, EmptyState, PageHeader, Panel, PanelHeader, useToast } from "./ui";

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
        aria-label={`${totals.free} free, ${totals.occupied} occupied of ${totals.total} slots`}
      >
        {[
          { n: totals.occupied, cls: "bg-white/35" },
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

/* ── Expired monthly passes ───────────────────────────────── */
function ExpiredPassesPanel() {
  const state = useSparcState();
  const store = useSparcStore();
  const toast = useToast();
  const now = useNow(30000);
  const expired = useMemo(() => state.users.filter((u) => isExpired(u, now)), [state.users, now]);

  function renew(name: string, id: string) {
    const result = store.renewUser(id);
    toast(result.ok ? `${name}'s monthly pass renewed.` : result.error, result.ok ? "ok" : "error");
  }

  return (
    <Panel aria-labelledby="expired-title">
      <PanelHeader
        id="expired-title"
        title="Expired monthly passes"
        aside={
          expired.length > 0 ? (
            <Link href="/admin/users" className="text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-gold">
              Open users
            </Link>
          ) : undefined
        }
      />
      {expired.length === 0 ? (
        <div className="flex items-start gap-3 px-4 pb-5 sm:px-5">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
          <p className="text-sm leading-relaxed text-ink-muted">
            Nothing waiting. When a driver&apos;s monthly pass lapses, it shows up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {expired.slice(0, 5).map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <CalendarClock className="size-4 shrink-0 text-crimson" aria-hidden />
                  {u.name}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">Expired {formatDate(u.expiresAt)} · {u.nfcId}</p>
              </div>
              <button type="button" className="c-btn c-btn-sm" onClick={() => renew(u.name, u.id)} aria-label={`Renew ${u.name}'s monthly pass`}>
                <RotateCw className="size-3.5" aria-hidden />
                Renew
              </button>
            </li>
          ))}
          {expired.length > 5 && <li className="px-4 py-2.5 text-xs text-ink-muted sm:px-5">+ {expired.length - 5} more</li>}
        </ul>
      )}
    </Panel>
  );
}

/* ── Recent activity ──────────────────────────────────────── */
function describe(l: LogEntry) {
  if (l.event === "entry") return { icon: ArrowRightToLine, tone: "text-live", text: `${l.userName} entered`, where: l.slot };
  return { icon: ArrowLeftFromLine, tone: "text-ink-soft", text: `${l.userName} left`, where: l.slot };
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
        <EmptyState title="No gate activity yet">Entries and exits appear here as they happen.</EmptyState>
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
                    Slot <span className="font-mono">{d.where}</span> · {timeAgo(l.at, now)}
                  </p>
                </div>
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
        description={`New parking building · ${state.config.length} floors · ${total} slots.`}
      />

      <div data-enter className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <BuildingPanel />
        <TodayPanel />
      </div>

      <div data-enter>
        <ParkingTowers />
      </div>

      <div data-enter className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        <ExpiredPassesPanel />
        <RevealPanel delay={80}>
          <ActivityFeed />
        </RevealPanel>
      </div>
    </div>
  );
}
