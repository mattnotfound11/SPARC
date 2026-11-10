import type { Metadata } from "next";
import { ScanView } from "@/components/console/ScanView";

export const metadata: Metadata = { title: "Entry / Exit · Admin" };

export default function ScanPage() {
  return <ScanView />;
}
