import type { Metadata } from "next";
import { AnalyticsView } from "@/components/console/AnalyticsView";

export const metadata: Metadata = { title: "Analytics · Admin" };

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
