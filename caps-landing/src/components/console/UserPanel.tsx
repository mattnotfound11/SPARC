"use client";

import { useEffect, useRef, useState } from "react";
import { Nfc, RotateCw, X } from "lucide-react";
import gsap from "gsap";
import { useNfcReader } from "@/lib/nfc/useNfcReader";
import { useNow, useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import { addOneMonth, normalizeNfc, normalizeStudentId, validateUser, type UserErrors } from "@/lib/sparc/store";
import { VEHICLE_LABEL, formatDate, isExpired } from "@/lib/sparc/selectors";
import type { RegisteredUser, UserInput, UserRole, VehicleClass } from "@/lib/sparc/types";
import { useRenewConfirm } from "./RenewConfirm";
import { Field, useToast } from "./ui";

export type PanelMode = { type: "add"; nfc?: string } | { type: "edit"; user: RegisteredUser };

const ROLES: UserRole[] = ["student", "personnel", "visitor"];
export const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  personnel: "Personnel",
  visitor: "Visitor",
};

/** What the school-issued ID is called for each role. */
export const ID_LABEL: Record<UserRole, string> = {
  student: "Student ID",
  personnel: "Employee ID",
  visitor: "ID number",
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Slide-over for registering or editing a card holder. */
export function UserPanel({ mode, onClose }: { mode: PanelMode; onClose: () => void }) {
  const state = useSparcState();
  const store = useSparcStore();
  const toast = useToast();
  const now = useNow(60000);
  const sheet = useRef<HTMLDivElement>(null);
  const editing = mode.type === "edit" ? mode.user : null;
  const liveEditing = editing ? (state.users.find((u) => u.id === editing.id) ?? editing) : null;

  const [form, setForm] = useState<UserInput>(() =>
    editing
      ? { name: editing.name, studentId: editing.studentId ?? "", nfcId: editing.nfcId, role: editing.role, vehicle: editing.vehicle, active: editing.active }
      : { name: "", studentId: "", nfcId: mode.type === "add" ? (mode.nfc ?? "") : "", role: "student", vehicle: "light", active: true },
  );
  const [errors, setErrors] = useState<UserErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Slide in, focus the first field, trap Tab, close on Escape, and hand focus back on exit.
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const opener = document.activeElement as HTMLElement | null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      gsap.fromTo(el, { xPercent: 100 }, { xPercent: 0, duration: 0.5, ease: "power3.out", clearProps: "transform" });
      gsap.fromTo("[data-backdrop]", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
    }
    el.querySelector<HTMLElement>("input, select")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(el!.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof UserInput>(key: K, value: UserInput[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (submitted) setErrors(validateUser(next, state.users, editing?.id));
  }

  // A card tap fills the NFC ID, then the reader switches itself off.
  const stopScan = useRef<() => void>(() => {});
  const reader = useNfcReader((serial) => {
    update("nfcId", serial);
    stopScan.current();
  });
  useEffect(() => {
    stopScan.current = reader.stop;
  }, [reader.stop]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const found = validateUser(form, state.users, editing?.id);
    setErrors(found);
    if (Object.keys(found).length) {
      sheet.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    const result = editing ? store.updateUser(editing.id, form) : store.addUser(form);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(editing ? `${form.name.trim()} updated.` : `${form.name.trim()} registered. Their card now opens the gate.`);
    onClose();
  }

  const { ask: askRenew, dialog: renewDialog } = useRenewConfirm();

  const invalid = (k: keyof UserInput) => (errors[k] ? true : undefined);

  return (
    <div className="fixed inset-0 z-50">
      <div data-backdrop className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-panel-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line-strong bg-surface shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="user-panel-title" className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
            {editing ? "Edit user" : "Register user"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.05] hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <Field label="Full name" htmlFor="u-name" error={errors.name}>
              <input id="u-name" className="c-input w-full" autoComplete="off" value={form.name} onChange={(e) => update("name", e.target.value)} aria-invalid={invalid("name")} aria-describedby={errors.name ? "u-name-error" : undefined} />
            </Field>

            <Field label={`${ID_LABEL[form.role]} (optional)`} htmlFor="u-sid" error={errors.studentId} hint="As printed on the school ID, like 2021-00123. This is not the card's chip ID.">
              <input
                id="u-sid"
                className="c-input w-full font-mono"
                autoComplete="off"
                spellCheck={false}
                value={form.studentId}
                onChange={(e) => update("studentId", e.target.value)}
                onBlur={() => form.studentId && update("studentId", normalizeStudentId(form.studentId))}
                aria-invalid={invalid("studentId")}
                aria-describedby={errors.studentId ? "u-sid-error" : "u-sid-hint"}
              />
            </Field>

            <Field label="NFC card ID" htmlFor="u-nfc" error={errors.nfcId} hint={reader.message ?? "Scan a card, or type digits like 1234-5678-9012 or hex like 04:A1:B2:C3."}>
              <div className="flex gap-2">
              <input
                id="u-nfc"
                className="c-input w-full font-mono"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                value={form.nfcId}
                onChange={(e) => update("nfcId", e.target.value)}
                onBlur={() => form.nfcId && update("nfcId", normalizeNfc(form.nfcId))}
                aria-invalid={invalid("nfcId")}
                aria-describedby={errors.nfcId ? "u-nfc-error" : "u-nfc-hint"}
              />
              <button
                type="button"
                className="c-btn shrink-0"
                disabled={reader.status === "unsupported"}
                onClick={reader.status === "scanning" ? reader.stop : reader.start}
              >
                <Nfc className="size-4" aria-hidden />
                {reader.status === "scanning" ? "Tap a card…" : "Scan card"}
              </button>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role" htmlFor="u-role">
                <select id="u-role" className="c-input w-full" value={form.role} onChange={(e) => update("role", e.target.value as UserRole)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vehicle" htmlFor="u-vehicle">
                <select id="u-vehicle" className="c-input w-full" value={form.vehicle} onChange={(e) => update("vehicle", e.target.value as VehicleClass)}>
                  {(["light", "heavy"] as VehicleClass[]).map((v) => (
                    <option key={v} value={v}>
                      {VEHICLE_LABEL[v]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-field/60 px-3.5 py-3">
              <input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-gold" />
              <span>
                <span className="block text-sm font-semibold text-ink">Card is active</span>
                <span className="block text-[0.8125rem] text-ink-muted">Turn off to suspend this card without deleting the user. The gate will deny it.</span>
              </span>
            </label>

            <div className="rounded-xl border border-line bg-field/60 px-3.5 py-3">
              <p className="text-sm font-semibold text-ink">Monthly pass</p>
              {liveEditing ? (
                <>
                  <p className={`mt-1 text-[0.8125rem] ${isExpired(liveEditing, now) ? "text-crimson" : "text-ink-muted"}`}>
                    {isExpired(liveEditing, now) ? "Expired" : "Valid until"} {formatDate(liveEditing.expiresAt)}
                  </p>
                  <button type="button" onClick={() => askRenew(liveEditing)} className="c-btn c-btn-sm mt-2.5">
                    <RotateCw className="size-3.5" aria-hidden />
                    Renew for another month
                  </button>
                </>
              ) : (
                <p className="mt-1 text-[0.8125rem] text-ink-muted">
                  Starts today and runs one month, until {formatDate(addOneMonth(now))}.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" className="c-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="c-btn c-btn-gold">
              {editing ? "Save changes" : "Register user"}
            </button>
          </div>
        </form>
      </div>
      {renewDialog}
    </div>
  );
}
