"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { useSparcStore } from "@/lib/sparc/SparcProvider";
import { passEndAfter } from "@/lib/semesters/semesters";
import { useSemesters } from "@/lib/semesters/useSemesters";
import { formatDate } from "@/lib/sparc/selectors";
import type { RegisteredUser } from "@/lib/sparc/types";
import { useToast } from "./ui";

const DAY = 24 * 60 * 60 * 1000;

function RenewDialog({ user, onCancel, onConfirm }: { user: RegisteredUser; onCancel: () => void; onConfirm: (expiresAt: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [now] = useState(() => Date.now());
  const expired = user.expiresAt <= now;
  const daysLeft = Math.ceil((user.expiresAt - now) / DAY);
  // Renewing runs to the end of the next semester: the one that ends after the current pass does (or after today, if it already lapsed).
  const { semesters } = useSemesters();
  const next = semesters ? passEndAfter(semesters, Math.max(now, user.expiresAt)) : undefined;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    // A slide-over underneath listens for Escape/Tab on document (as does React itself), so stop keys at the dialog.
    const stop = (e: KeyboardEvent) => e.stopPropagation();
    el.addEventListener("keydown", stop);
    return () => el.removeEventListener("keydown", stop);
  }, []);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby="renew-title"
      aria-describedby="renew-desc"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line-strong bg-surface p-0 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
            <RotateCw className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="renew-title" className="font-display text-lg font-semibold tracking-[-0.01em]">
              Renew semester pass?
            </h2>
            <p id="renew-desc" className="mt-1 text-sm text-ink-muted">
              Please confirm you want to renew the pass for <span className="font-semibold text-ink">{user.name}</span>.
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-line bg-field/60 px-4 py-3 text-sm">
          {user.studentId && (
            <>
              <dt className="text-ink-muted">Student ID</dt>
              <dd className="font-mono">{user.studentId}</dd>
            </>
          )}
          <dt className="text-ink-muted">Card</dt>
          <dd className="font-mono">{user.nfcId}</dd>
          <dt className="text-ink-muted">Current pass</dt>
          <dd className={expired ? "text-crimson" : ""}>
            {expired ? "Expired" : "Valid until"} {formatDate(user.expiresAt)}
          </dd>
          <dt className="text-ink-muted">After renewal</dt>
          <dd className={next ? "font-semibold text-live" : "text-ink-muted"}>
            {next === undefined ? "Loading the semester dates…" : next ? `Valid until ${formatDate(next.endsAt)} (${next.name})` : "No semester set up"}
          </dd>
        </dl>

        {next === null && (
          <p className="mt-3 text-[0.8125rem] text-gold">
            No semester ends after this pass, so there is no end date to renew to.{" "}
            <Link href="/admin/semesters" className="font-semibold underline">
              Add the semester dates
            </Link>{" "}
            first.
          </p>
        )}
        {next && !expired && daysLeft > 0 && (
          <p className="mt-3 text-[0.8125rem] text-ink-muted">
            The current pass is still valid for {daysLeft} {daysLeft === 1 ? "day" : "days"}. Renewing moves it to the end of the next semester.
          </p>
        )}
        {!user.active && (
          <p className="mt-3 text-[0.8125rem] text-gold">This card is suspended. Renewing also reactivates it, so the gate will let it in again.</p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="c-btn" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button type="button" className="c-btn c-btn-gold" onClick={() => next && onConfirm(next.endsAt)} disabled={!next}>
            <RotateCw className="size-4" aria-hidden />
            Yes, renew pass
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Renewing a pass always asks first. `ask(user)` opens the confirmation; render `dialog` once in the component. */
export function useRenewConfirm() {
  const store = useSparcStore();
  const toast = useToast();
  const [user, setUser] = useState<RegisteredUser | null>(null);

  const dialog = user ? (
    <RenewDialog
      key={user.id}
      user={user}
      onCancel={() => setUser(null)}
      onConfirm={(expiresAt) => {
        const result = store.renewUser(user.id, expiresAt);
        setUser(null);
        toast(result.ok ? `${user.name}'s semester pass renewed until ${formatDate(expiresAt)}.` : result.error, result.ok ? "ok" : "error");
      }}
    />
  ) : null;

  return { ask: setUser, dialog };
}
