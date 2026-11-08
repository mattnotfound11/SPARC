import type { Metadata } from "next";
import { ReportsView } from "@/components/console/ReportsView";

export const metadata: Metadata = { title: "Reports · Admin" };

export default function ReportsPage() {
  return <ReportsView />;
}
