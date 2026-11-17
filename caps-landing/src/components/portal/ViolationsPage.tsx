"use client";

import { PortalShell } from "./PortalShell";
import { ViolationsView } from "./ViolationsView";

export function ViolationsPage() {
  return <PortalShell>{(card) => <ViolationsView card={card} />}</PortalShell>;
}
