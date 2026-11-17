"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Badge, Panel, PanelHeader } from "@/components/console/ui";
import { STATUS_LABEL, buildProfile, forecastDecks, hasHistory, sampleHistory, type DeckStatus } from "@/lib/forecast/forecast";
import { usePortalState } from "@/lib/portal/usePortal";
import { SparcGate, useNow, useSparcState } from "@/lib/sparc/SparcProvider";

const TONE: Record<DeckStatus, "live" | "gold" | "crimson"> = { available: "live", filling: "gold", full: "crimson" };
const BAR: Record<DeckStatus, string> = { available: "bg-live", filling: "bg-gold", full: "bg-crimson" };

function Decks({ screen }: { screen: boolean }) {
  const state = useSparcState();
  const now = useNow(60000);
  // The campus screen has no buttons, so it shows the demo history when its address ends in ?demo.
  const demo = usePortalState().demo === true;
  const [pick, setPick] = useState<boolean | null>(() => (screen && new URLSearchParams(window.location.search).has("demo") ? true : null));
  // The demo account turns the sample history on by itself, until real gate traffic exists
  const sample = pick ?? (demo && state.logs.length === 0);

  const logs = useMemo(() => (sample ? sampleHistory(state.config, now) : state.logs), [sample, state.config, state.logs, now]);
  const floors = useMemo(() => state.config.map((f) => f.floor), [state.config]);
  const profile = useMemo(() => buildProfile(logs, floors, now), [logs, floors, now]);
  const decks = useMemo(() => forecastDecks(profile, state.config, now), [profile, state.config, now]);
  const empty = !hasHistory(profile);

  if (empty) {
    return (
      <div className={screen ? "px-8 pb-8 text-xl text-ink-muted" : "border-t border-line px-4 py-5 sm:px-5"}>
        <p className={screen ? "" : "text-sm leading-relaxed text-ink-muted"}>
          The forecast learns from past weeks of gate traffic, and there isn&apos;t enough yet.
        </p>
        {!screen && (
          <button type="button" className="c-btn c-btn-sm mt-3" onClick={() => setPick(true)}>
            Show with sample history (demo)
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className={screen ? "grid gap-4 px-8 pb-8 sm:grid-cols-2" : "border-t border-line"}>
        {[...decks].reverse().map((d) => (
          <li
            key={d.floor}
            className={screen ? "rounded-2xl border border-line bg-field/60 p-6" : "border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5"}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`font-display font-semibold text-ink ${screen ? "text-3xl" : "text-base"}`}>Level {d.floor}</p>
              {screen ? (
                <span className={`rounded-lg px-3 py-1 text-xl font-semibold ${d.status === "full" ? "bg-crimson/20 text-[#ff9aab]" : d.status === "filling" ? "bg-gold/15 text-[#ffd666]" : "bg-live/15 text-[#86efac]"}`}>
                  {STATUS_LABEL[d.status]}
                </span>
              ) : (
                <Badge tone={TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
              )}
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
              <div className={`h-full rounded-full ${BAR[d.status]}`} style={{ width: `${Math.round(d.ratio * 100)}%` }} />
            </div>
            <p className={`mt-2.5 text-ink-muted ${screen ? "text-xl" : "text-sm"}`}>{d.message}</p>
          </li>
        ))}
      </ul>
      {sample && !screen && <p className="border-t border-line px-4 py-2.5 text-xs text-ink-faint sm:px-5">Sample history, not real gate traffic.</p>}
    </>
  );
}

/** Per-deck outlook for the next hour, built from past weeks of entries. Used on the driver portal and the campus screen. */
export function ForecastCard({ screen = false }: { screen?: boolean }) {
  return (
    <Panel aria-labelledby="forecast-title" className={screen ? "!rounded-3xl" : ""}>
      {screen ? (
        <h2 id="forecast-title" className="flex items-center gap-3 px-8 pt-8 pb-5 font-display text-4xl font-semibold tracking-[-0.02em] text-ink">
          <TrendingUp className="size-8 text-gold" aria-hidden />
          Parking outlook, next hour
        </h2>
      ) : (
        <PanelHeader id="forecast-title" title="Parking outlook, next hour" />
      )}
      <SparcGate fallback={<p className="border-t border-line px-4 py-5 text-sm text-ink-muted sm:px-5">Loading…</p>}>
        <Decks screen={screen} />
      </SparcGate>
    </Panel>
  );
}
