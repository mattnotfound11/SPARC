import type { Metadata } from "next";
import { ViolationsPage } from "@/components/portal/ViolationsPage";

export const metadata: Metadata = { title: "Violations · Driver portal" };

export default function ViolationsRoute() {
  return <ViolationsPage />;
}
