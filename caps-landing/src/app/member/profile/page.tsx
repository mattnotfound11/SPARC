import type { Metadata } from "next";
import { MemberProfile } from "@/components/member/MemberView";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <MemberProfile />;
}
