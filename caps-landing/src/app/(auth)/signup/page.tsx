import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Register for University of San Agustin campus parking access and a digital RFID pass.",
};

export default function SignupPage() {
  return <SignupForm />;
}
