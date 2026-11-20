"use client";

import { useState } from "react";
import { linkMemberLogin } from "@/lib/member/link";
import { useToast } from "./ui";

/** Edit-panel section: connect a Supabase login to this registered user so they get the Member view. */
export function MemberLoginLink({ userId, name }: { userId: string; name: string }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function link() {
    setBusy(true);
    const failure = await linkMemberLogin(email, userId);
    setBusy(false);
    setError(failure);
    if (!failure) {
      toast(`${name} can now sign in as a member with ${email.trim()}.`);
      setEmail("");
    }
  }

  return (
    <div className="rounded-xl border border-line bg-field/60 px-3.5 py-3">
      <p className="text-sm font-semibold text-ink">Member login</p>
      <p className="mt-1 text-[0.8125rem] text-ink-muted">Email of the member&apos;s account (created in Supabase). They then see their own pass and history at /login.</p>
      <div className="mt-2.5 flex gap-2">
        <input
          type="email"
          aria-label="Member account email"
          className="c-input w-full"
          autoComplete="off"
          placeholder="student@usa.edu.ph"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <button type="button" className="c-btn shrink-0" disabled={busy} onClick={link}>
          {busy ? "Linking…" : "Link"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[0.8125rem] text-crimson">{error}</p>}
    </div>
  );
}
