import type { Metadata } from "next";
import { LiveStatusView } from "@/components/console/LiveStatusView";

export const metadata: Metadata = { title: "Live status · Admin" };

export default function AdminPage() {
  return <LiveStatusView />;
}
