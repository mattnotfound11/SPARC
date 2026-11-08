"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useAuthMotion } from "@/hooks/useAuthMotion";
import { DEMO_EMAIL, DEMO_PASSWORD, signIn, useAdminSession } from "@/lib/mockSession";
import { FormNotice } from "./FormNotice";
import { PasswordField, TextField } from "./fields";

export function AdminLoginForm() {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const session = useAdminSession();
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
      setError("Enter your administrator email and password.");
      return;
    }
    setError(null);
    setPending(true);
    window.setTimeout(() => {
      if (signIn(email, password)) {
        router.replace("/admin");
      } else {
        setPending(false);
        setError("That email and password don't match an administrator account.");
      }
    }, 450);
  }

  return (
    <div ref={root} className="flex flex-1 flex-col lg:flex-none">
      <h1 data-anim className="mt-[1.125rem] font-display text-[1.875rem] leading-[1.1] font-bold tracking-[-0.02em] text-ink lg:mt-0 lg:text-[2.125rem]">
        Administrator sign in
      </h1>
      <p data-anim className="mt-2 mb-[1.375rem] text-ink-muted">
        Open the SPARC console to manage slots, users and the gate log.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col lg:flex-none">
        <TextField
          label="Administrator email"
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

        <div data-anim className="mb-4">
          <FormNotice>
            Prototype access: <span className="font-mono text-ink">{DEMO_EMAIL}</span> / <span className="font-mono text-ink">{DEMO_PASSWORD}</span>. The console shows
            simulated data only.
          </FormNotice>
        </div>

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
