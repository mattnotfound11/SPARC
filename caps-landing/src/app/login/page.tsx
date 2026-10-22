import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your SPARC parking portal at the University of San Agustin.",
};

export default function LoginPage() {
  return (
    <AuthShell
      below={
        <p className="mt-[clamp(0.5rem,1.6vh,1.25rem)] flex items-center gap-2 rounded-full border border-line-strong bg-[#11141c]/90 px-4 py-[clamp(0.375rem,1vh,0.625rem)] text-[0.8125rem] whitespace-nowrap text-ink-muted sm:px-5 sm:text-sm">
          <ShieldCheck aria-hidden className="size-4 text-gold" strokeWidth={2} />
          Campus Marshal or Admin?
          <Link href="/guard/login" className="font-medium text-ink underline underline-offset-2 hover:text-gold">
            Switch to Gate Access
          </Link>
        </p>
      }
      footer={
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <span>
            © {new Date().getFullYear()} University of San Agustin <span aria-hidden>•</span> SPARC System
          </span>
          <nav aria-label="Legal" className="flex gap-4">
            <a href="#" className="hover:text-ink">Privacy Policy</a>
            <a href="#" className="hover:text-ink">Terms of Access</a>
            <a href="#" className="hover:text-ink">Support Desk</a>
          </nav>
        </div>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
