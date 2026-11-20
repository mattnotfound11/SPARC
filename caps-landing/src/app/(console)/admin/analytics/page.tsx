import type { Metadata } from "next";
import { AnalyticsRedirect } from "@/components/console/AnalyticsRedirect";

export const metadata: Metadata = { title: "Reports · Admin" };

/** Analytics was merged into Reports; old links and bookmarks keep working. */
export default function AnalyticsPage() {
  return <AnalyticsRedirect />;
}
