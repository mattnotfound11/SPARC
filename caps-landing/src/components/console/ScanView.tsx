"use client";

import { useCallback, useState } from "react";
import { ArrowLeftFromLine, ArrowRightToLine, Nfc } from "lucide-react";
import { useNfcReader } from "@/lib/nfc/useNfcReader";
import { useNow, useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import { buildingTotals, floorStats, timeAgo } from "@/lib/sparc/selectors";
import type { ScanMode, ScanOutcome } from "@/lib/sparc/types";
import { Count, EmptyState, PageHeader, Panel, PanelHeader } from "./ui";
import { ScanResultCard } from "./ScanResultCard";

const SUMMARY: Record<ScanOutcome["status"], string> = {
  entered: "Entered",
  exited: "Exited",
  "already-inside": "Already inside",
  "not-inside": "Not inside",
  expired: "Pass expired",
  "no-pass": "Invalid monthly pass",
  full: "No free slot",
  unregistered: "Unregistered card",
};

const MODES = [
  { id: "entry", label: "Entry", icon: ArrowRightToLine, on: "border-live/60 bg-live/[0.14] text-[#86efac]" },
  { id: "exit", label: "Exit", icon: ArrowLeftFromLine, on: "border-gold/60 bg-gold/[0.14] text-[#ffd666]" },
] as const satisfies readonly { id: ScanMode; label: string; icon: unknown; on: string }[];

export function ScanView() {
  const store = useSparcStore();
  const state = useSparcState();
  const now = useNow(15000);
  const [mode, setMode] = useState<ScanMode>("entry");
  const modeLabel = mode === "entry" ? "Entry" : "Exit";

  const onScan = useCallback((serial: string) => void store.scan(serial, mode), [store, mode]);
  const reader = useNfcReader(onScan);

  const stats = floorStats(state.config, state.slots);
  const totals = buildingTotals(stats);
  const latest = state.scans[0];

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader title="Entry / Exit" description="Tap a driver's card to record a vehicle entering or leaving." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <Panel aria-labelledby="scan-title" className="p-4 sm:p-5">
          <h2 id="scan-title" className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
            Scanner
          </h2>

          <div role="radiogroup" aria-label="Scan type" className="mt-4 grid max-w-md grid-cols-2 gap-1.5 rounded-xl border border-line bg-field/60 p-1.5">
            {MODES.map(({ id, label, icon: Icon, on }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(id)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border text-[0.9375rem] font-semibold transition-colors ${
                    active ? on : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                  {label} scan
                </button>
              );
            })}
          </div>
          <p className={`mt-2 text-sm font-semibold ${mode === "entry" ? "text-live" : "text-gold"}`}>
            Scanning for {modeLabel.toUpperCase()}: {mode === "entry" ? "taps let vehicles in." : "taps check vehicles out."}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reader.status === "scanning" ? reader.stop : reader.start}
              disabled={reader.status === "unsupported"}
              className="c-btn c-btn-gold"
            >
              <Nfc className="size-5" aria-hidden />
              {reader.status === "scanning" ? "Scanner on · tap to stop" : "Enable NFC scanner"}
            </button>
            {reader.status === "scanning" && !reader.message && (
              <p className="text-sm text-live">Ready for {modeLabel.toLowerCase()}. Hold a card to the back of the phone.</p>
            )}
            {reader.message && (
              <p role="status" className="text-sm text-ink-muted">
                {reader.message}
              </p>
            )}
          </div>

          <div className="mt-5" aria-live="polite">
            {latest ? (
              <ScanResultCard outcome={latest.outcome} now={now} />
            ) : (
              <EmptyState title="Waiting for a card">The result of each tap shows here.</EmptyState>
            )}
          </div>
        </Panel>

        <Panel aria-labelledby="count-title" className="p-4 sm:p-5">
          <h2 id="count-title" className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
            Free slots
          </h2>
          <p className="mt-2 font-display text-[2.5rem] leading-none font-semibold tracking-tight text-ink">
            <Count value={totals.free} />
            <span className="text-lg font-normal text-ink-faint"> / {totals.total}</span>
          </p>
        </Panel>
      </div>

      <Panel aria-labelledby="recent-title">
        <PanelHeader id="recent-title" title="Recent scans" />
        {state.scans.length === 0 ? (
          <EmptyState title="No scans yet" />
        ) : (
          <ul className="border-t border-line">
            {state.scans.slice(0, 10).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{"user" in s.outcome ? s.outcome.user.name : "Unknown card"}</p>
                  <p className="truncate font-mono text-xs text-ink-muted">{s.nfcId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-ink-soft">{SUMMARY[s.outcome.status]}</p>
                  <p className="text-xs text-ink-muted">{timeAgo(s.at, now)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
