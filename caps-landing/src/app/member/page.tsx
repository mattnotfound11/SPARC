import type { Metadata } from "next";
import { MemberHome } from "@/components/member/MemberView";

export const metadata: Metadata = { title: "Live status" };

export default function MemberPage() {
  return <MemberHome />;
}
