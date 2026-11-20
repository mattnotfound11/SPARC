import type { Metadata } from "next";
import { MemberShell } from "@/components/member/MemberShell";
import { MemberView } from "@/components/member/MemberView";

export const metadata: Metadata = { title: "My parking pass" };

export default function MemberPage() {
  return <MemberShell>
      <MemberView />
    </MemberShell>;
}
