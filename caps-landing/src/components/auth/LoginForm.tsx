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

const labelClass = "mb-[clamp(0.25rem,0.8vh,0.5rem)] block text-[0.8125rem] font-semibold tracking-[0.06em] text-ink-soft uppercase";

export function LoginForm() {
  const [status, setStatus] = useState<Status>("idle");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    // No auth service is connected yet; surface that honestly instead of faking a login.
    window.setTimeout(() => setStatus("unavailable"), 700);
  }

  return (
    <div className="px-5 py-[clamp(1rem,3vh,2.5rem)] sm:px-10">
      <div className="flex flex-col items-center text-center">
        <SparcSeal
          size={96}
          priority
          className="size-[clamp(3rem,7vh,6rem)] ring-4 ring-[#f6eee0] shadow-[0_0_0_7px_rgba(245,179,1,0.1),0_10px_40px_-6px_rgba(245,179,1,0.45)]"
        />
        <h1 className="mt-[clamp(0.625rem,1.8vh,1.5rem)] text-[clamp(1.5rem,3.4vh,2.125rem)] leading-tight font-bold tracking-tight text-ink">
          Welcome Back
        </h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted sm:text-base">Sign in to access your SPARC parking portal</p>
      </div>

      <div className="mt-[clamp(0.75rem,2vh,1.75rem)]">
        <AuthTabs active="login" />
      </div>

      <form onSubmit={handleSubmit} className="mt-[clamp(0.75rem,2vh,1.75rem)] space-y-[clamp(0.5rem,1.5vh,1.25rem)]">
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

        <div className="flex items-center justify-between text-base">
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
          className="btn btn-gold pulse-gold gold-glow flex h-[clamp(2.625rem,6vh,3.375rem)] w-full items-center justify-center gap-2 rounded-xl bg-gold text-base font-bold text-on-gold disabled:cursor-wait disabled:opacity-80"
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

      <div className="my-[clamp(0.625rem,1.8vh,1.5rem)] flex items-center gap-4 text-xs font-medium tracking-[0.12em] text-ink-muted">
        <span className="h-px flex-1 bg-line-strong" />
        OR
        <span className="h-px flex-1 bg-line-strong" />
      </div>

      <button
        type="button"
        onClick={() => setStatus("unavailable")}
        className="btn btn-outline flex h-[clamp(2.5rem,5.6vh,3.25rem)] w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-white/[0.02] text-base font-medium text-ink"
      >
        <GoogleIcon className="size-5" />
        Continue with Google
      </button>

      <div className="mt-[clamp(0.625rem,1.8vh,1.5rem)] border-t border-line pt-[clamp(0.625rem,1.8vh,1.5rem)] text-center text-base text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-ink underline-offset-4 transition-colors hover:text-gold-bright hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}
