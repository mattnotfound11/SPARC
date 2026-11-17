"use client";

import { PortalShell } from "./PortalShell";
import { VisitorsView } from "./VisitorsView";

export function VisitorsPage() {
  return <PortalShell>{(card) => <VisitorsView card={card} />}</PortalShell>;
}
