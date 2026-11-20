"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle, MailCheck } from "lucide-react";
import { useAuthMotion } from "@/hooks/useAuthMotion";
import { MEMBER_EMAIL_DOMAIN, MIN_PASSWORD, validateSignup, type SignupErrors } from "@/lib/member/logic";
import { signUpMember } from "@/lib/session";
import { AuthTabs } from "./AuthTabs";
import { FormNotice } from "./FormNotice";
import { PasswordField, SelectField, TextField } from "./fields";

type Status = "idle" | "submitting" | "sent";

const ID_LABEL = { student: "Student ID", personnel: "Employee ID" } as const;

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="-mt-2.5 mb-4 text-sm text-crimson">
      {message}
    </p>
  ) : null;
}

export function SignupForm() {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [role, setRole] = useState<keyof typeof ID_LABEL>("student");
  const [errors, setErrors] = useState<SignupErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  useAuthMotion(root);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      name: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      role,
      studentId: String(data.get("studentId") ?? ""),
      password: String(data.get("password") ?? ""),
      confirm: String(data.get("confirmPassword") ?? ""),
    };
    const found = validateSignup(input);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    setStatus("submitting");
    const result = await signUpMember(input);
    if ("error" in result) {
      setStatus("idle");
      setFailure(result.error);
    } else {
      setSentTo(input.email.trim().toLowerCase());
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div ref={root} className="flex flex-1 flex-col lg:flex-none">
        <MailCheck data-anim aria-hidden className="mt-[1.125rem] size-10 text-gold lg:mt-0" strokeWidth={1.75} />
        <h1 data-anim className="mt-4 font-display text-[1.875rem] leading-[1.1] font-bold tracking-[-0.02em] text-ink lg:text-[2.125rem]">
          Check your email
        </h1>
        <p data-anim className="mt-3 text-ink-muted">
          We sent a confirmation link to <span className="font-semibold text-ink">{sentTo}</span>. Open it to finish creating your
          account, then sign in.
        </p>
        <p data-anim className="mt-3 text-sm text-ink-muted">
          Your parking pass is linked once you confirm, if your name and ID match your registration with the parking office. No email after a
          few minutes? Check spam, or ask the parking office to link your account.
        </p>
        <Link
          data-anim
          href="/login"
          className="mt-6 flex h-[3.375rem] w-full items-center justify-center rounded-lg bg-gold text-[1.0625rem] font-bold text-on-gold transition-colors hover:bg-gold-bright"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div ref={root} className="flex flex-1 flex-col lg:flex-none">
      <h1 data-anim className="mt-[1.125rem] font-display text-[1.875rem] leading-[1.1] font-bold tracking-[-0.02em] text-ink lg:mt-0 lg:text-[2.125rem]">
        Create account
      </h1>
      <p data-anim className="mt-2 mb-[1.375rem] text-ink-muted">
        For students and personnel with a registered monthly parking pass
      </p>

      <AuthTabs active="signup" />

      <form onSubmit={handleSubmit} noValidate className="mt-[1.375rem] flex flex-1 flex-col lg:flex-none">
        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          placeholder="As registered with the parking office"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "su-name-err" : undefined}
        />
        <FieldError id="su-name-err" message={errors.name} />

        <TextField
          label="University email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={`you${MEMBER_EMAIL_DOMAIN}`}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "su-email-err" : undefined}
        />
        <FieldError id="su-email-err" message={errors.email} />

        <div className="sm:grid sm:grid-cols-2 sm:gap-x-4">
          <SelectField label="Campus role" name="role" value={role} onChange={(e) => setRole(e.target.value as keyof typeof ID_LABEL)}>
            <option value="student">Student</option>
            <option value="personnel">Personnel</option>
          </SelectField>
          <div>
            <TextField
              label={ID_LABEL[role]}
              name="studentId"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="2024-10037"
              aria-invalid={errors.studentId ? true : undefined}
              aria-describedby={errors.studentId ? "su-id-err" : undefined}
            />
            <FieldError id="su-id-err" message={errors.studentId} />
          </div>
        </div>

        <div className="sm:grid sm:grid-cols-2 sm:gap-x-4">
          <div>
            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD} characters`}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "su-pw-err" : undefined}
            />
            <FieldError id="su-pw-err" message={errors.password} />
          </div>
          <div>
            <PasswordField
              label="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm password"
              aria-invalid={errors.confirm ? true : undefined}
              aria-describedby={errors.confirm ? "su-confirm-err" : undefined}
            />
            <FieldError id="su-confirm-err" message={errors.confirm} />
          </div>
        </div>

        {failure && (
          <div role="alert" className="mb-3">
            <FormNotice>{failure}</FormNotice>
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
              "Create account"
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
