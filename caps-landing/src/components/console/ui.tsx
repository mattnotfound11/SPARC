"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useCountTo } from "@/hooks/useConsoleMotion";
import type { VehicleClass } from "@/lib/sparc/types";
import { VEHICLE_LABEL } from "@/lib/sparc/selectors";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header data-enter className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="display text-[1.75rem] text-ink sm:text-[2.125rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`c-panel ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  aside,
  id,
}: {
  title: string;
  aside?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
      <h2 id={id} className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {aside}
    </div>
  );
}

/** Live-updating whole number. */
export function Count({ value, className = "" }: { value: number; className?: string }) {
  const ref = useCountTo(value);
  return (
    <span ref={ref} className={`num ${className}`}>
      {value}
    </span>
  );
}

const tones = {
  gold: "border-gold/30 bg-gold/[0.1] text-[#ffd666]",
  live: "border-live/35 bg-live/[0.1] text-[#86efac]",
  crimson: "border-crimson/40 bg-crimson/[0.12] text-[#ff9aab]",
  neutral: "border-line-strong bg-white/[0.04] text-ink-soft",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function VehicleBadge({ vehicle }: { vehicle: VehicleClass }) {
  return <Badge>{VEHICLE_LABEL[vehicle]}</Badge>;
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Labelled field for console forms. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-[0.8125rem] text-[#ff9aab]">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="mt-1.5 text-[0.8125rem] text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/* ── Toasts ───────────────────────────────────────────────── */
type Toast = { id: number; tone: "ok" | "error"; message: string };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, tone, message }]);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6 lg:right-6"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, toast.tone === "error" ? 7000 : 4000);
    return () => window.clearTimeout(id);
  }, [toast, onDone]);

  const Icon = toast.tone === "ok" ? CheckCircle2 : CircleAlert;
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className="reveal in pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line-strong bg-surface-raised px-3.5 py-3 text-sm text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${toast.tone === "ok" ? "text-live" : "text-crimson"}`} aria-hidden />
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDone}
        aria-label="Dismiss"
        className="-m-1 rounded-md p-1 text-ink-muted transition-colors hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
