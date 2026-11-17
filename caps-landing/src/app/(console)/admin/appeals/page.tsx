import type { Metadata } from "next";
import { AppealsView } from "@/components/console/AppealsView";

export const metadata: Metadata = { title: "Appeals · Admin" };

export default function AppealsPage() {
  return <AppealsView />;
}
