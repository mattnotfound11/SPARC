import { Check, Nfc } from "lucide-react";

/** Gate console: a card tap resolving to an access decision. */
export function GateTapDemo() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[#0b0e15] p-5 sm:p-6">
      {/* scan sweep */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16 overflow-hidden">
        <div className="sweep-y h-px w-full bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      </div>

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.1em] text-ink-muted uppercase">
          <span className="dot-pulse size-1.5 rounded-full bg-live" />
          Gate 1 · General Luna
        </span>
        <span className="font-mono text-xs text-ink-faint">07:42:11</span>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
          <Nfc className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] font-semibold text-ink">USA-2026-04817</p>
          <p className="truncate text-sm text-ink-muted">Faculty · Sedan · ABC 1234</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-live/25 bg-live/10 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-live">
          <Check className="size-4" strokeWidth={3} aria-hidden />
          Access granted
        </span>
        <span className="font-mono text-xs text-live/80">0.41s</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ["Barrier", "Lifted"],
          ["Zone", "Ground"],
          ["Logged", "Synced"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-surface/60 px-2 py-2">
            <p className="text-[0.6875rem] tracking-wide text-ink-faint uppercase">{k}</p>
            <p className="mt-0.5 text-[0.8125rem] font-medium text-ink-soft">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
