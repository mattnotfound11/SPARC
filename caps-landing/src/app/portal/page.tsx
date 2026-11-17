import type { Metadata } from "next";
import { VehiclesPage } from "@/components/portal/VehiclesPage";

export const metadata: Metadata = { title: "My vehicles · Driver portal" };

export default function PortalPage() {
  return <VehiclesPage />;
}
