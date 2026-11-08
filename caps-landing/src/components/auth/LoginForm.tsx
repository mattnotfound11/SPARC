"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useAuthMotion } from "@/hooks/useAuthMotion";
import { AuthTabs } from "./AuthTabs";
import { FormNotice } from "./FormNotice";
import { GoogleIcon } from "./GoogleIcon";
import { PasswordField, TextField } from "./fields";

type Status = "idle" | "submitting" | "unavailable";

export function LoginForm() {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  useAuthMotion(root);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    // No auth service is connected yet; surface that honestly instead of faking a login.
    window.setTimeout(() => setStatus("unavailable"), 700);
  }

  return (
    <div ref={root} className="flex flex-1 flex-col lg:flex-none">
      <h1 data-anim className="mt-[1.125rem] font-display text-[1.875rem] leading-[1.1] font-bold tracking-[-0.02em] text-ink lg:mt-0 lg:text-[2.125rem]">
        Welcome back
      </h1>
      <p data-anim className="mt-2 mb-[1.375rem] text-ink-muted">
        Sign in to access your SPARC parking portal
      </p>

      <AuthTabs active="login" />

      <form onSubmit={handleSubmit} className="mt-[1.375rem] flex flex-1 flex-col lg:flex-none">
        <TextField
          label="Institutional email or ID"
          name="identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="student@usa.edu.ph"
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />

        <div data-anim className="mb-4 flex items-center justify-between text-[0.9375rem]">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-ink-soft">
            <input type="checkbox" name="remember" className="size-5 cursor-pointer accent-gold" />
            Remember me
          </label>
          <a href="#" className="font-semibold text-ink underline underline-offset-4 transition-colors hover:text-gold">
            Forgot password?
          </a>
        </div>

        <button
          type="button"
          data-anim
          onClick={() => setStatus("unavailable")}
          className="mb-3 flex h-[3.25rem] w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-surface-raised text-base font-semibold text-ink transition-colors hover:border-gold/50"
        >
          <GoogleIcon className="size-5" />
          Continue with Google
        </button>

        {status === "unavailable" && (
          <div className="mb-3">
            <FormNotice>
              Sign-in isn&apos;t live yet — the SPARC account service hasn&apos;t been connected to this
              portal. Your details were not sent anywhere.
            </FormNotice>
          </div>
        )}

        <div
          data-anim
          className="sticky bottom-0 mt-auto -mx-5 bg-canvas px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:mt-2 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0"
        >
          <button
            type="submit"
            disabled={status === "submitting"}
            className="flex h-[3.375rem] w-full items-center justify-center gap-2 rounded-lg bg-gold text-[1.0625rem] font-bold text-on-gold transition-colors hover:bg-gold-bright disabled:cursor-wait disabled:opacity-80"
          >
            {status === "submitting" ? (
              <>
                <LoaderCircle className="size-[1.125rem] animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </div>
      </form>

      <p data-anim className="pt-4 text-center text-[0.9375rem] leading-[1.9] text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-ink underline-offset-4 transition-colors hover:text-gold hover:underline">
          Register here
        </Link>
        <br />
        Parking administrator?{" "}
        <Link href="/admin/login" className="font-semibold text-ink underline-offset-4 transition-colors hover:text-gold hover:underline">
          Open the admin console
        </Link>
      </p>
    </div>
  );
}
