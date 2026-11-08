import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

export const metadata: Metadata = {
  title: "Administrator sign in",
  description: "Sign in to the SPARC admin console at the University of San Agustin.",
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
