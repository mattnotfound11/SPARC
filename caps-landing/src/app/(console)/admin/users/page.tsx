import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsoleSkeleton } from "@/components/console/ConsoleShell";
import { UsersView } from "@/components/console/UsersView";

export const metadata: Metadata = { title: "Users · Admin" };

export default function UsersPage() {
  // useSearchParams (for the "register this card" link from an alert) needs a Suspense boundary
  return (
    <Suspense fallback={<ConsoleSkeleton />}>
      <UsersView />
    </Suspense>
  );
}
