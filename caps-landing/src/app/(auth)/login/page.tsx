import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your SPARC parking portal at the University of San Agustin.",
};

export default function LoginPage() {
  return <LoginForm />;
}
