"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useAuthMotion } from "@/hooks/useAuthMotion";
import { AuthTabs } from "./AuthTabs";
import { FormNotice } from "./FormNotice";
import { homeFor, parseEmailLink } from "@/lib/member/logic";
import { DEMO_MEMBER, DEMO_PASSWORD } from "@/lib/mockSession";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockAllowed, resendConfirmation, signInAccount, useMemberSession, type SignInFailure } from "@/lib/session";
import { PasswordField, TextField } from "./fields";

type Status = "idle" | "submitting";

/**
 * What the email link that brought the student here said. Read once when the page loads, before the
 * auth library clears the address fragment, and not during the server render (there is no address then).
 */
const EMAIL_LINK = typeof window === "undefined" ? null : parseEmailLink(window.location.hash);

const subscribeNever = () => () => {};

/** How long a student waits before asking for the confirmation email again. */
const RESEND_WAIT_SECONDS = 60;

export function LoginForm() {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const member = useMemberSession();
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  // False while the page is server-rendered and while it hydrates, so the banner never mismatches the HTML.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [linkShown, setLinkShown] = useState(true);
  const link = mounted && linkShown ? EMAIL_LINK : null;
  const [lastEmail, setLastEmail] = useState("");
  const [wait, setWait] = useState(0);
  const [resendNote, setResendNote] = useState<{ ok: boolean; text: string } | null>(null);
  const error = failure?.error ?? null;
  useAuthMotion(root);

  // Arrived from the confirmation email: show the result, and drop the session the link started so the
  // student signs in themselves. The address fragment is cleaned either way.
  useEffect(() => {
    if (!EMAIL_LINK) return;
    const db = getSupabase();
    // getSession waits until the library has finished reading the link, so the sign-out can't race it.
    const finish = () => window.history.replaceState(null, "", window.location.pathname);
    if (EMAIL_LINK === "confirmed" && db) void db.auth.getSession().then(() => db.auth.signOut({ scope: "local" })).finally(finish);
    else finish();
  }, []);

  // Already signed in as a member: go straight to the dashboard (not mid sign-in, so errors stay put,
  // and not when they just confirmed their email, so the sign-in step is the one they see).
  useEffect(() => {
    if (member.status === "in" && status !== "submitting" && !EMAIL_LINK) router.replace("/member");
  }, [member.status, status, router]);

  // Counts the resend wait down.
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function resend() {
    setResendNote(null);
    setWait(RESEND_WAIT_SECONDS);
    const problem = await resendConfirmation(lastEmail);
    setResendNote(problem ? { ok: false, text: problem } : { ok: true, text: `Sent to ${lastEmail.trim().toLowerCase()}. Check spam if you don't see it.` });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("identifier") ?? "");
    const password = String(data.get("password") ?? "");
    if (!email.trim() || !password) {
      setFailure({ error: "Enter your institutional email and password." });
      return;
    }
    setFailure(null);
    setResendNote(null);
    setLinkShown(false);
    setLastEmail(email);
    setStatus("submitting");
    const result = await signInAccount(email, password);
    if ("error" in result) {
      setStatus("idle");
      setFailure(result);
    } else {
      router.replace(homeFor(result.type));
    }
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

      <form onSubmit={handleSubmit} noValidate className="mt-[1.375rem] flex flex-1 flex-col lg:flex-none">
        <TextField
          label="Institutional email"
          name="identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="student@usa.edu.ph"
          aria-invalid={error ? true : undefined}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          aria-invalid={error ? true : undefined}
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

        {link === "confirmed" && (
          <div role="status" className="mb-3">
            <FormNotice>Email confirmed. Sign in with your email and password to continue.</FormNotice>
          </div>
        )}

        {link === "expired" && (
          <div role="alert" className="mb-3">
            <FormNotice>
              That confirmation link has expired or was already used. If you confirmed before, just sign in. If not, sign in below and we&apos;ll
              offer to send a new one.
            </FormNotice>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-3">
            <FormNotice>{error}</FormNotice>
            {failure?.kind === "unconfirmed" && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <button
                  type="button"
                  onClick={resend}
                  disabled={wait > 0}
                  className="font-semibold text-ink underline underline-offset-4 transition-colors enabled:hover:text-gold disabled:cursor-not-allowed disabled:text-ink-muted disabled:no-underline"
                >
                  {wait > 0 ? `Send again in ${wait}s` : "Send the confirmation email again"}
                </button>
              </div>
            )}
            {resendNote && (
              <p role="status" className={`mt-2 text-sm ${resendNote.ok ? "text-live" : "text-crimson"}`}>
                {resendNote.text}
              </p>
            )}
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

      {!isSupabaseConfigured && mockAllowed && (
        <p data-anim className="pt-3 text-center text-sm text-ink-muted">
          Development demo member: <span className="font-mono">{DEMO_MEMBER.email}</span> / <span className="font-mono">{DEMO_PASSWORD}</span>
        </p>
      )}

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
