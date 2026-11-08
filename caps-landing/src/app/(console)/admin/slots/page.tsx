import type { Metadata } from "next";
import { SlotSetupView } from "@/components/console/SlotSetupView";

export const metadata: Metadata = { title: "Slots & floors · Admin" };

export default function SlotsPage() {
  return <SlotSetupView />;
}
