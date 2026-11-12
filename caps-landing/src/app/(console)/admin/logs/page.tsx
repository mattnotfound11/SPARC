import type { Metadata } from "next";
import { LogsView } from "@/components/console/LogsView";

export const metadata: Metadata = { title: "Audit log · Admin" };

export default function LogsPage() {
  return <LogsView />;
}
