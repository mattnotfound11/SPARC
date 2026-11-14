"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useAuthMotion } from "@/hooks/useAuthMotion";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/mockSession";
import { authConfigured, signInStaff, useStaffSession } from "@/lib/staffAuth";
import { FormNotice } from "./FormNotice";
import { PasswordField, TextField } from "./fields";

export function AdminLoginForm() {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const session = useStaffSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useAuthMotion(root);

  // Already signed in: go straight to the console.
  useEffect(() => {
    if (session.status === "in") router.replace("/admin");
  }, [session.status, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    if (!email.trim() || !password) {
      setError("Enter your staff email and password.");
      return;
    }
    setError(null);
    setPending(true);
    void signInStaff(email, password).then((result) => {
      if (result.ok) {
        router.replace("/admin");
      } else {
        setPending(false);
        setError(result.error);
      }
    });
  }

  return (
    <div ref={root} className="flex flex-1 flex-col lg:flex-none">
      <h1 data-anim className="mt-[1.125rem] font-display text-[1.875rem] leading-[1.1] font-bold tracking-[-0.02em] text-ink lg:mt-0 lg:text-[2.125rem]">
        Staff sign in
      </h1>
      <p data-anim className="mt-2 mb-[1.375rem] text-ink-muted">
        For administrators and facilitators. Open the SPARC console to run the gate and manage parking.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col lg:flex-none">
        <TextField
          label="Staff email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="admin@usa.edu.ph"
          aria-invalid={error ? true : undefined}
        />
        <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Enter your password" aria-invalid={error ? true : undefined} />

        {error && (
          <p role="alert" className="mb-3 rounded-xl border border-crimson/40 bg-crimson/[0.1] px-3.5 py-3 text-[0.8125rem] leading-relaxed text-[#ffb3c0]">
            {error}
          </p>
        )}

        {!authConfigured && (
        <div data-anim className="mb-4">
          <FormNotice>
            Prototype access. The console shows simulated data only.
            {DEMO_ACCOUNTS.map((a) => (
              <span key={a.email} className="mt-2 block">
                <span className="font-semibold text-ink capitalize">{a.role}:</span>{" "}
                <span className="font-mono text-ink">{a.email}</span> /{" "}
                <span className="font-mono text-ink">{DEMO_PASSWORD}</span>
              </span>
            ))}
          </FormNotice>
        </div>
        )}

        <div
          data-anim
          className="sticky bottom-0 mt-auto -mx-5 bg-canvas px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:mt-2 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0"
        >
          <button
            type="submit"
            disabled={pending}
            className="flex h-[3.375rem] w-full items-center justify-center gap-2 rounded-lg bg-gold text-[1.0625rem] font-bold text-on-gold transition-colors hover:bg-gold-bright disabled:cursor-wait disabled:opacity-80"
          >
            {pending ? (
              <>
                <LoaderCircle className="size-[1.125rem] animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in to console"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
