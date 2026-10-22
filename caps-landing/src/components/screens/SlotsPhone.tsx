import { Navigation } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { HomeBar, StatusBar } from "./PhoneChrome";

const decks = [
  { name: "Ground deck", free: 8, total: 96, tone: "crimson" },
  { name: "Level 2", free: 52, total: 120, tone: "gold" },
  { name: "Level 3", free: 73, total: 134, tone: "live" },
];

const bar: Record<string, string> = {
  crimson: "bg-crimson",
  gold: "bg-gold",
  live: "bg-live",
};

/** Live slot availability, checked before driving in. */
export function SlotsPhone() {
  return (
    <div className="flex h-full w-full flex-col bg-canvas text-ink">
      <StatusBar />

      <div className="flex-1 px-6 pt-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2.5 font-display text-[19px] font-semibold tracking-tight">
            <SparcSeal size={26} />
            Available slots
          </p>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <span className="dot-pulse size-1.5 rounded-full bg-live" />
            Live
          </span>
        </div>

        <div className="mt-5 rounded-3xl border border-line bg-surface/70 p-5 text-center">
          <p className="font-display text-[56px] leading-none font-semibold text-gold">133</p>
          <p className="mt-2 text-[13px] text-ink-muted">bays free of 350 · updated 2s ago</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full w-[38%] rounded-full bg-gold" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[0.08] px-4 py-3.5">
          <Navigation className="size-[18px] text-gold" strokeWidth={2} aria-hidden />
          <div>
            <p className="text-[14px] font-medium">Head to Level 3</p>
            <p className="text-[12px] text-ink-muted">Most room right now · ramp B</p>
          </div>
        </div>

        <p className="mt-6 text-[14px] font-medium">By deck</p>
        <ul className="mt-3 space-y-3.5">
          {decks.map(({ name, free, total, tone }) => (
            <li key={name} className="rounded-2xl border border-line bg-surface/60 px-4 py-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] text-ink-soft">{name}</span>
                <span className="text-[13px]">
                  <span className="font-semibold">{free}</span>
                  <span className="text-ink-faint"> / {total}</span>
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full ${bar[tone]}`}
                  style={{ width: `${Math.round((free / total) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <HomeBar />
    </div>
  );
}
