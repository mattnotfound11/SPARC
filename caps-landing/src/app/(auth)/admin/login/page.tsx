import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

export const metadata: Metadata = {
  title: "Staff sign in",
  description: "Administrators and facilitators: sign in to the SPARC console at the University of San Agustin.",
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
