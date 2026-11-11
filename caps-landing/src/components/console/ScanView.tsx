"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Nfc, Smartphone } from "lucide-react";
import { useNfcReader } from "@/lib/nfc/useNfcReader";
import { useIsIOS } from "@/lib/nfc/platform";
import { useNow, useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import { buildingTotals, floorStats, timeAgo } from "@/lib/sparc/selectors";
import type { ScanOutcome } from "@/lib/sparc/types";
import { Count, EmptyState, PageHeader, Panel, PanelHeader } from "./ui";
import { ScanResultCard } from "./ScanResultCard";

const SUMMARY: Record<ScanOutcome["status"], string> = {
  entered: "Entered",
  exited: "Exited",
  expired: "Pass expired",
  "no-pass": "Invalid monthly pass",
  full: "No free slot",
  unregistered: "Unregistered card",
};

export function ScanView() {
  const store = useSparcStore();
  const state = useSparcState();
  const now = useNow(15000);
  const [manual, setManual] = useState("");
  const [copied, setCopied] = useState(false);
  const onIOS = useIsIOS();

  const onScan = useCallback((serial: string) => void store.scan(serial), [store]);
  const reader = useNfcReader(onScan);

  // Safari can't do Web NFC on iOS, so an iPhone/iPad Shortcut (its "Scan NFC
  // Tag" action, built in since iOS 13) scans the card and opens this page as
  // /admin/scan?nfc=<id> instead — the same shape as a real tap.
  const router = useRouter();
  const params = useSearchParams();
  const shortcutId = params.get("nfc");
  // Guards against StrictMode's intentional double-invoke (and any other
  // re-run with the same id) actually logging the tap twice.
  const dispatchedId = useRef<string | null>(null);
  useEffect(() => {
    if (!shortcutId || dispatchedId.current === shortcutId) return;
    dispatchedId.current = shortcutId;
    store.scan(shortcutId);
    router.replace("/admin/scan"); // drop the param so a refresh doesn't rescan
  }, [shortcutId, store, router]);

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
              <p className="text-sm text-live">Ready. Hold a card to the back of the phone.</p>
            )}
            {reader.message && (
              <p role="status" className="text-sm text-ink-muted">
                {reader.message}
              </p>
            )}
          </div>

          {reader.status === "unsupported" && onIOS && (
            <div className="mt-4 rounded-xl border border-line bg-field/60 p-3.5 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-ink">
                <Smartphone className="size-4 text-gold" aria-hidden />
                iPhone/iPad: scan with the Shortcuts app
              </p>
              <p className="mt-1 text-ink-muted">
                Safari can&apos;t read NFC. A Shortcut can: add <span className="text-ink">Scan NFC Tag</span>, then{" "}
                <span className="text-ink">Open URLs</span> with the card&apos;s Identifier appended to —
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg border border-line-strong bg-canvas/60 px-2.5 py-1.5 font-mono text-xs text-ink-soft">
                  {typeof window === "undefined" ? "" : `${window.location.origin}/admin/scan?nfc=`}
                </code>
                <button
                  type="button"
                  className="c-btn c-btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/admin/scan?nfc=`).then(
                      () => setCopied(true),
                      () => setCopied(false),
                    );
                  }}
                >
                  {copied ? <Check className="size-4 text-live" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {reader.status === "unsupported" && (
            <form
              className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (manual.trim()) store.scan(manual);
                setManual("");
              }}
            >
              <label htmlFor="sim-nfc" className="text-sm text-ink-muted">
                Simulate a scan
              </label>
              <input
                id="sim-nfc"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="04:A1:B2:C3"
                className="c-input w-44 font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="c-btn">
                Scan
              </button>
            </form>
          )}

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
          <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
            {stats.map((f) => (
              <li key={f.floor} className="flex justify-between">
                <span>Floor {f.floor}</span>
                <span className="font-mono text-ink-soft">
                  {f.free} / {f.total}
                </span>
              </li>
            ))}
          </ul>
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
