"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useAuthMotion } from "@/hooks/useAuthMotion";
import { AuthTabs } from "./AuthTabs";
import { FormNotice } from "./FormNotice";
import { PasswordField, SelectField, TextField } from "./fields";

type Status = "idle" | "submitting" | "unavailable";

export function SignupForm() {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  useAuthMotion(root);

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
    <div ref={root} className="flex flex-1 flex-col lg:flex-none">
      <h1 data-anim className="mt-[1.125rem] font-display text-[1.875rem] leading-[1.1] font-bold tracking-[-0.02em] text-ink lg:mt-0 lg:text-[2.125rem]">
        Create account
      </h1>
      <p data-anim className="mt-2 mb-[1.375rem] text-ink-muted">
        Register for campus parking access &amp; digital RFID pass
      </p>

      <AuthTabs active="signup" />

      <form onSubmit={handleSubmit} className="mt-[1.375rem] flex flex-1 flex-col lg:flex-none">
        <TextField label="Full name" name="fullName" autoComplete="name" placeholder="Full Name" required />
        <TextField
          label="University email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="University Email"
          required
        />

        <div className="sm:grid sm:grid-cols-2 sm:gap-x-4">
          <SelectField label="Campus role" name="role" defaultValue="student">
            <option value="student">Student</option>
            <option value="personnel">Personnel</option>
            <option value="visitor">Visitor</option>
          </SelectField>
          <SelectField label="Vehicle type" name="vehicleType" defaultValue="4-wheel">
            <option value="4-wheel">4-Wheel (Car/SUV)</option>
            <option value="2-wheel">2-Wheel (Motor)</option>
          </SelectField>
        </div>

        <TextField
          label="Plate no. / MV file"
          name="plate"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABC 1234"
          className="uppercase placeholder:normal-case"
          required
        />

        <div className="sm:grid sm:grid-cols-2 sm:gap-x-4">
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            placeholder="Password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div>
            <PasswordField
              label="Confirm password"
              name="confirmPassword"
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
              <p id="signup-confirm-error" className="-mt-2.5 mb-4 text-sm text-crimson">
                Passwords don&apos;t match — re-enter the same password.
              </p>
            )}
          </div>
        </div>

        <label data-anim className="mb-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft">
          <input type="checkbox" name="agree" required className="mt-0.5 size-5 shrink-0 cursor-pointer accent-gold" />
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
          <div className="mb-3">
            <FormNotice>
              Registration isn&apos;t live yet — the SPARC account service hasn&apos;t been connected to
              this portal. Nothing was submitted.
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
                Creating account…
              </>
            ) : (
              "Create account & register vehicle"
            )}
          </button>
        </div>
      </form>

      <p data-anim className="pt-4 text-center text-[0.9375rem] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline-offset-4 transition-colors hover:text-gold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
