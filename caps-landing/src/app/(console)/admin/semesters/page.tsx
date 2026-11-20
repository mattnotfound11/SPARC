import type { Metadata } from "next";
import { SemestersView } from "@/components/console/SemestersView";

export const metadata: Metadata = { title: "Semesters · Admin" };

export default function SemestersPage() {
  return <SemestersView />;
}
