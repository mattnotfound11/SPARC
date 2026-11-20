import type { Metadata } from "next";
import { MemberHistory } from "@/components/member/MemberView";

export const metadata: Metadata = { title: "Parking history" };

export default function Page() {
  return <MemberHistory />;
}
