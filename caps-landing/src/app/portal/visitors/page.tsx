import type { Metadata } from "next";
import { VisitorsPage } from "@/components/portal/VisitorsPage";

export const metadata: Metadata = { title: "Visitor passes · Driver portal" };

export default function VisitorsRoute() {
  return <VisitorsPage />;
}
