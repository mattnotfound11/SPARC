import type { Metadata } from "next";
import { InsideView } from "@/components/console/InsideView";

export const metadata: Metadata = { title: "Inside now · Admin" };

export default function InsidePage() {
  return <InsideView />;
}
