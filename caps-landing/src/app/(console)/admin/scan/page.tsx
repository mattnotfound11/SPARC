import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsoleSkeleton } from "@/components/console/ConsoleShell";
import { ScanView } from "@/components/console/ScanView";

export const metadata: Metadata = { title: "Entry / Exit · Admin" };

export default function ScanPage() {
  // useSearchParams (for the iOS Shortcuts bridge, ?nfc=<id>) needs a Suspense boundary
  return (
    <Suspense fallback={<ConsoleSkeleton />}>
      <ScanView />
    </Suspense>
  );
}
