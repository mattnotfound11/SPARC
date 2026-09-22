"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Lock, Mail } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { AuthTabs } from "./AuthTabs";
import { FormNotice } from "./FormNotice";
import { GoogleIcon } from "./GoogleIcon";
import { IconInput, PasswordInput } from "./fields";

type Status = "idle" | "submitting" | "unavailable";

const labelClass = "mb-2 block text-xs font-semibold tracking-[0.06em] text-ink-soft uppercase";

export function LoginForm() {
  const [status, setStatus] = useState<Status>("idle");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    // No auth service is connected yet; surface that honestly instead of faking a login.
    window.setTimeout(() => setStatus("unavailable"), 700);
  }

  return (
    <div className="px-6 pt-9 pb-7 sm:px-9">
      <div className="flex flex-col items-center text-center">
        <SparcSeal
          size={88}
          priority
          className="ring-4 ring-[#f6eee0] shadow-[0_0_0_7px_rgba(245,179,1,0.1),0_10px_40px_-6px_rgba(245,179,1,0.45)]"
        />
        <h1 className="mt-6 text-[1.75rem] leading-tight font-bold tracking-tight text-ink">Welcome Back</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">Sign in to access your SPARC parking portal</p>
      </div>

      <div className="mt-7">
        <AuthTabs active="login" />
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate={false}>
        <div>
          <label htmlFor="login-identifier" className={labelClass}>
            Institutional Email or ID
          </label>
          <IconInput
            id="login-identifier"
            name="identifier"
            icon={Mail}
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="student@usa.edu.ph"
            required
          />
        </div>

        <div>
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <PasswordInput
            id="login-password"
            name="password"
            icon={Lock}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </div>

        <div className="flex items-center justify-between text-[0.9375rem]">
          <label className="flex cursor-pointer items-center gap-2.5 text-ink-soft">
            <input
              type="checkbox"
              name="remember"
              className="size-4 cursor-pointer rounded border-line-strong accent-gold"
            />
            Remember me
          </label>
          <a href="#" className="text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline">
            Forgot password?
          </a>
        </div>

        {status === "unavailable" && (
          <FormNotice>
            Sign-in isn&apos;t live yet — the SPARC account service hasn&apos;t been connected to this
            portal. Your details were not sent anywhere.
          </FormNotice>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="gold-glow flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-gold text-[0.9375rem] font-bold text-on-gold transition-colors hover:bg-gold-bright disabled:cursor-wait disabled:opacity-80"
        >
          {status === "submitting" ? (
            <>
              <LoaderCircle className="size-[1.125rem] animate-spin" aria-hidden />
              Signing In…
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="size-[1.125rem]" strokeWidth={2.25} aria-hidden />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4 text-[0.6875rem] font-medium tracking-[0.12em] text-ink-muted">
        <span className="h-px flex-1 bg-line-strong" />
        OR
        <span className="h-px flex-1 bg-line-strong" />
      </div>

      <button
        type="button"
        onClick={() => setStatus("unavailable")}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-white/[0.02] text-[0.9375rem] font-medium text-ink transition-colors hover:border-white/20 hover:bg-white/[0.05]"
      >
        <GoogleIcon className="size-[1.125rem]" />
        Continue with Google
      </button>

      <div className="mt-6 border-t border-line pt-6 text-center text-[0.9375rem] text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-ink underline-offset-4 hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}
