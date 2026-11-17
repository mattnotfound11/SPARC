import type { Metadata } from "next";
import { ParkingPage } from "@/components/portal/ParkingPage";

export const metadata: Metadata = { title: "My parking · Driver portal" };

export default function ParkingRoute() {
  return <ParkingPage />;
}
