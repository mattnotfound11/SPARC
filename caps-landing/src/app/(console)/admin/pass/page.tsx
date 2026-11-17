import type { Metadata } from "next";
import { PassScanView } from "@/components/console/PassScanView";

export const metadata: Metadata = { title: "Visitor pass · Admin" };

export default function PassPage() {
  return <PassScanView />;
}
