import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Register for University of San Agustin campus parking access and a digital RFID pass.",
};

export default function SignupPage() {
  return (
    <AuthShell
      width={440}
      footer={
        <p className="flex items-center gap-1.5">
          <LockKeyhole aria-hidden className="size-3.5" strokeWidth={2} />
          Official University of San Agustin Parking &amp; Access Portal
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
