import type { Metadata } from "next";
import { MemberNotifications } from "@/components/member/MemberView";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <MemberNotifications />;
}
