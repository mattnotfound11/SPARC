"use client";

import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";
import { useNow } from "@/lib/sparc/SparcProvider";
import { EventBanner } from "./EventBanner";
import { ForecastCard } from "./ForecastCard";

/** Full-screen outlook for the lobby and gate displays. Refreshes itself; nothing to click. */
export function ScreenBoard() {
  const now = useNow(30000);
  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col justify-center gap-8 px-8 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SparcSeal size={56} priority className="size-14" />
          <SparcWordmark className="text-4xl text-ink" />
        </div>
        <p className="font-display text-4xl font-semibold tabular-nums text-ink-soft">
          {new Date(now).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
        </p>
      </header>
      <EventBanner screen />
      <ForecastCard screen />
    </div>
  );
}
