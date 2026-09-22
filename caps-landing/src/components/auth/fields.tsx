"use client";

import { useState } from "react";
import { ChevronDown, Eye, EyeOff, type LucideIcon } from "lucide-react";

type FieldSize = "md" | "sm";

const shell: Record<FieldSize, string> = {
  md: "h-[52px] rounded-xl pl-12 pr-4 text-[0.9375rem]",
  sm: "h-11 rounded-lg pl-9 pr-3 text-[0.8125rem]",
};
const iconPos: Record<FieldSize, string> = {
  md: "left-4 size-[1.125rem]",
  sm: "left-3 size-4",
};

const base =
  "input-field w-full border border-line-strong bg-field text-ink placeholder:text-ink-muted outline-none hover:border-white/20";

type IconInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon: LucideIcon;
  fieldSize?: FieldSize;
  trailing?: React.ReactNode;
};

export function IconInput({ icon: Icon, fieldSize = "md", trailing, className = "", ...props }: IconInputProps) {
  return (
    <div className="relative">
      <Icon aria-hidden className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-muted ${iconPos[fieldSize]}`} strokeWidth={1.75} />
      <input className={`${base} ${shell[fieldSize]} ${trailing ? "pr-12" : ""} ${className}`} {...props} />
      {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
    </div>
  );
}

type PasswordInputProps = Omit<IconInputProps, "type" | "trailing">;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <IconInput
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
        >
          {visible ? <EyeOff className="size-[1.125rem]" strokeWidth={1.75} /> : <Eye className="size-[1.125rem]" strokeWidth={1.75} />}
        </button>
      }
    />
  );
}

type IconSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  icon: LucideIcon;
  fieldSize?: FieldSize;
};

export function IconSelect({ icon: Icon, fieldSize = "sm", className = "", children, ...props }: IconSelectProps) {
  return (
    <div className="relative">
      <Icon aria-hidden className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-muted ${iconPos[fieldSize]}`} strokeWidth={1.75} />
      <select className={`${base} ${shell[fieldSize]} cursor-pointer appearance-none pr-8 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={2} />
    </div>
  );
}
