"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Car, FileText, IdCard, LoaderCircle, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { AuthTabs } from "./AuthTabs";
import { FormNotice } from "./FormNotice";
import { IconInput, IconSelect, PasswordInput } from "./fields";

type Status = "idle" | "submitting" | "unavailable";

export function SignupForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const mismatch = confirmTouched && confirm.length > 0 && confirm !== password;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmTouched(true);
    if (confirm !== password) return;
    setStatus("submitting");
    // No registration service is connected yet; say so instead of pretending it worked.
    window.setTimeout(() => setStatus("unavailable"), 800);
  }

  return (
    <div className="px-5 pt-6 pb-6 sm:px-7">
      <div className="flex flex-col items-center text-center">
        <SparcSeal
          size={50}
          priority
          className="ring-[3px] ring-[#f6eee0] shadow-[0_0_0_5px_rgba(245,179,1,0.12),0_6px_24px_-4px_rgba(245,179,1,0.5)]"
        />
        <h1 className="mt-4 text-[1.5rem] leading-tight font-bold tracking-tight text-ink">Create Account</h1>
        <p className="mx-auto mt-1.5 max-w-[17rem] text-[0.8125rem] leading-snug text-ink-muted">
          Register for campus parking access &amp; digital RFID pass
        </p>
      </div>

      <div className="mt-5">
        <AuthTabs active="signup" size="sm" />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label htmlFor="signup-name" className="sr-only">Full name</label>
        <IconInput id="signup-name" name="fullName" icon={User} fieldSize="sm" autoComplete="name" placeholder="Full Name" required />

        <label htmlFor="signup-email" className="sr-only">University email</label>
        <IconInput
          id="signup-email"
          name="email"
          type="email"
          icon={Mail}
          fieldSize="sm"
          autoComplete="email"
          placeholder="University Email"
          required
        />

        <label htmlFor="signup-role" className="sr-only">Campus role</label>
        <IconSelect id="signup-role" name="role" icon={IdCard} defaultValue="student">
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="staff">Administrative Staff</option>
        </IconSelect>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr]">
          <div>
            <label htmlFor="signup-vehicle" className="sr-only">Vehicle type</label>
            <IconSelect id="signup-vehicle" name="vehicleType" icon={Car} defaultValue="4-wheel">
              <option value="4-wheel">4-Wheel (Car / SUV)</option>
              <option value="2-wheel">2-Wheel (Motorcycle)</option>
            </IconSelect>
          </div>
          <div>
            <label htmlFor="signup-plate" className="sr-only">Plate number or MV file number</label>
            <IconInput
              id="signup-plate"
              name="plate"
              icon={FileText}
              fieldSize="sm"
              autoComplete="off"
              placeholder="PLATE NO. / MV FILE"
              className="uppercase"
              required
            />
          </div>
        </div>

        <label htmlFor="signup-password" className="sr-only">Password</label>
        <PasswordInput
          id="signup-password"
          name="password"
          icon={Lock}
          fieldSize="sm"
          autoComplete="new-password"
          placeholder="Password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div>
          <label htmlFor="signup-confirm" className="sr-only">Confirm password</label>
          <PasswordInput
            id="signup-confirm"
            name="confirmPassword"
            icon={ShieldCheck}
            fieldSize="sm"
            autoComplete="new-password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setConfirmTouched(true)}
            aria-invalid={mismatch || undefined}
            aria-describedby={mismatch ? "signup-confirm-error" : undefined}
            required
          />
          {mismatch && (
            <p id="signup-confirm-error" className="mt-1.5 pl-1 text-xs text-crimson">
              Passwords don&apos;t match — re-enter the same password.
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-relaxed text-ink-soft">
          <input type="checkbox" name="agree" required className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-gold" />
          <span>
            I agree to the{" "}
            <a href="#" className="font-medium text-ink underline underline-offset-2 hover:text-gold">
              University Parking Regulations
            </a>{" "}
            and{" "}
            <a href="#" className="font-medium text-ink underline underline-offset-2 hover:text-gold">
              Privacy Policy
            </a>
          </span>
        </label>

        {status === "unavailable" && (
          <FormNotice>
            Registration isn&apos;t live yet — the SPARC account service hasn&apos;t been connected to
            this portal. Nothing was submitted.
          </FormNotice>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn btn-gold pulse-gold gold-glow mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-bright to-gold-deep text-sm font-bold text-on-gold disabled:cursor-wait disabled:opacity-80"
        >
          {status === "submitting" ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Creating Account…
            </>
          ) : (
            <>
              Create Account &amp; Register Vehicle
              <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 border-t border-line pt-5 text-center text-[0.8125rem] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-gold underline-offset-4 transition-colors hover:text-gold-bright hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
