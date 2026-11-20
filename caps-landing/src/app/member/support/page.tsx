import type { Metadata } from "next";
import { MemberSupport } from "@/components/member/MemberView";

export const metadata: Metadata = { title: "Contact support" };

export default function Page() {
  return <MemberSupport />;
}
