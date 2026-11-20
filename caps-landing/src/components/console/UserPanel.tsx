"use client";

import { useEffect, useRef, useState } from "react";
import { Nfc, RotateCw, X } from "lucide-react";
import gsap from "gsap";
import { useNfcReader } from "@/lib/nfc/useNfcReader";
import { useNow, useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import { addOneMonth, normalizeNfc, validateCard } from "@/lib/sparc/store";
import { formatDate, isExpired, isPending } from "@/lib/sparc/selectors";
import type { RegisteredUser, UserRole } from "@/lib/sparc/types";
import { useRenewConfirm } from "./RenewConfirm";
import { Field, useToast } from "./ui";

/**
 * Members register themselves, so this panel never creates anyone. It either activates a pending
 * member's pass (scan the card, start the month) or manages an existing member (card, suspend, renew).
 */
export type PanelMode = { type: "activate"; user: RegisteredUser; nfc?: string } | { type: "manage"; user: RegisteredUser };

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

/** Slide-over for activating a pending pass or managing a member's card. */
export function UserPanel({ mode, onClose }: { mode: PanelMode; onClose: () => void }) {
  const state = useSparcState();
  const store = useSparcStore();
  const toast = useToast();
  const now = useNow(60000);
  const sheet = useRef<HTMLDivElement>(null);
  const activating = mode.type === "activate";
  // Read the live record, so a renewal made from this panel shows its new date.
  const user = state.users.find((u) => u.id === mode.user.id) ?? mode.user;

  const [nfcId, setNfcId] = useState(mode.type === "activate" ? (mode.nfc ?? "") : user.nfcId);
  const [active, setActive] = useState(user.active);
  const [error, setError] = useState<string | null>(null);

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

  // A card tap fills the card field, then the reader switches itself off.
  const stopScan = useRef<() => void>(() => {});
  const reader = useNfcReader((serial) => {
    setNfcId(serial);
    setError(null);
    stopScan.current();
  });
  useEffect(() => {
    stopScan.current = reader.stop;
  }, [reader.stop]);

  const { ask: askRenew, dialog: renewDialog } = useRenewConfirm();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cardError = nfcId.trim() ? validateCard(nfcId, state.users, user.id) : "Scan the member's card, or type its number.";
    if (cardError) {
      setError(cardError);
      sheet.current?.querySelector<HTMLElement>("#u-nfc")?.focus();
      return;
    }
    if (activating) {
      const result = store.activateUser(user.id, nfcId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast(`${user.name}'s pass is active until ${formatDate(addOneMonth(Date.now()))}.`);
    } else {
      const result = store.updateUser(user.id, {
        name: user.name,
        studentId: user.studentId ?? "",
        nfcId,
        role: user.role,
        active,
        email: user.email,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast(`${user.name} updated.`);
    }
    onClose();
  }

  const pending = isPending(user);

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
            {activating ? "Activate monthly pass" : "Manage member"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.05] hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <dl className="rounded-xl border border-line bg-field/60 px-3.5 py-3 text-sm">
              <dt className="sr-only">Name</dt>
              <dd className="font-display text-lg font-semibold text-ink">{user.name}</dd>
              <dt className="sr-only">Role and ID</dt>
              <dd className="mt-0.5 text-ink-muted">
                {ROLE_LABEL[user.role]}
                {user.studentId && (
                  <>
                    {" · "}
                    {ID_LABEL[user.role]} <span className="font-mono text-ink-soft">{user.studentId}</span>
                  </>
                )}
              </dd>
              {user.email && (
                <>
                  <dt className="sr-only">Email</dt>
                  <dd className="mt-0.5 break-all text-ink-muted">{user.email}</dd>
                </>
              )}
              <dd className="mt-1.5 text-xs text-ink-faint">Signed up {formatDate(user.createdAt)}. These details come from the member and can&apos;t be edited here.</dd>
            </dl>

            <Field
              label="NFC card ID"
              htmlFor="u-nfc"
              error={error ?? undefined}
              hint={reader.message ?? (activating ? "Scan the member's campus card, or type digits like 1234-5678-9012 or hex like 04:A1:B2:C3." : "Change this only if the member has a new card.")}
            >
              <div className="flex gap-2">
                <input
                  id="u-nfc"
                  className="c-input w-full font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  value={nfcId}
                  onChange={(e) => {
                    setNfcId(e.target.value);
                    setError(null);
                  }}
                  onBlur={() => nfcId && setNfcId(normalizeNfc(nfcId))}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "u-nfc-error" : "u-nfc-hint"}
                />
                <button type="button" className="c-btn shrink-0" disabled={reader.status === "unsupported"} onClick={reader.status === "scanning" ? reader.stop : reader.start}>
                  <Nfc className="size-4" aria-hidden />
                  {reader.status === "scanning" ? "Tap a card…" : "Scan card"}
                </button>
              </div>
            </Field>

            {activating ? (
              <div className="rounded-xl border border-line bg-field/60 px-3.5 py-3">
                <p className="text-sm font-semibold text-ink">Monthly pass</p>
                <p className="mt-1 text-[0.8125rem] text-ink-muted">Starts today and runs one month, until {formatDate(addOneMonth(now))}. The gate lets this card in from now on.</p>
              </div>
            ) : (
              <>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-field/60 px-3.5 py-3">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-gold" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">Card is active</span>
                    <span className="block text-[0.8125rem] text-ink-muted">Turn off to suspend this card without removing the member. The gate will deny it.</span>
                  </span>
                </label>

                <div className="rounded-xl border border-line bg-field/60 px-3.5 py-3">
                  <p className="text-sm font-semibold text-ink">Monthly pass</p>
                  {pending ? (
                    <p className="mt-1 text-[0.8125rem] text-ink-muted">Pending. Activate the pass from the Users list.</p>
                  ) : (
                    <>
                      <p className={`mt-1 text-[0.8125rem] ${isExpired(user, now) ? "text-crimson" : "text-ink-muted"}`}>
                        {isExpired(user, now) ? "Expired" : "Valid until"} {formatDate(user.expiresAt)}
                      </p>
                      <button type="button" onClick={() => askRenew(user)} className="c-btn c-btn-sm mt-2.5">
                        <RotateCw className="size-3.5" aria-hidden />
                        Renew for another month
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" className="c-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="c-btn c-btn-gold">
              {activating ? "Activate pass" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
      {renewDialog}
    </div>
  );
}
