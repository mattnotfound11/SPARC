import type { Metadata } from "next";
import { ScreenBoard } from "@/components/portal/ScreenBoard";

export const metadata: Metadata = { title: "Parking outlook" };

export default function ScreenPage() {
  return (
    <main id="main-content" className="min-h-svh bg-canvas">
      <ScreenBoard />
    </main>
  );
}
