"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/reports");
  }, [router]);
  return (
    <p className="text-ink-muted">
      Analytics moved into <Link href="/admin/reports" className="font-semibold text-ink underline underline-offset-4">Reports</Link>.
    </p>
  );
}
