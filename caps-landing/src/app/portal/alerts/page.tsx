import type { Metadata } from "next";
import { AlertsPage } from "@/components/portal/AlertsPage";

export const metadata: Metadata = { title: "Alerts · Driver portal" };

export default function AlertsRoute() {
  return <AlertsPage />;
}
