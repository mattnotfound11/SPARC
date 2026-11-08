"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

/*
 * Labelled fields. 16px text (so iOS doesn't zoom on focus) and a 52px target.
 * Each wrapper carries `data-anim` so the form's entrance motion can stagger it.
 */
const control = "input-field h-[3.25rem] w-full rounded-lg px-3.5 text-base";
const labelClass = "mb-1.5 block text-sm font-semibold text-ink";

type Common = { label: string };

type TextFieldProps = Common & React.InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, id, className = "", ...props }: TextFieldProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div data-anim className="mb-4">
      <label htmlFor={fieldId} className={labelClass}>
        {label}
      </label>
      <input id={fieldId} className={`${control} ${className}`} {...props} />
    </div>
  );
}

type PasswordFieldProps = Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordField({ label, id, className = "", ...props }: PasswordFieldProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  const [visible, setVisible] = useState(false);
  return (
    <div data-anim className="mb-4">
      <label htmlFor={fieldId} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input id={fieldId} type={visible ? "text" : "password"} className={`${control} pr-[4.5rem] ${className}`} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute top-1 right-1 min-h-11 rounded-md px-3 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

type SelectFieldProps = Common & React.SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, id, className = "", children, ...props }: SelectFieldProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div data-anim className="mb-4">
      <label htmlFor={fieldId} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select id={fieldId} className={`${control} cursor-pointer appearance-none pr-10 ${className}`} {...props}>
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3.5 size-[1.125rem] -translate-y-1/2 text-ink-soft"
          strokeWidth={2}
        />
      </div>
    </div>
  );
}
