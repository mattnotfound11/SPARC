"use client";

import { AlertsView } from "./AlertsView";
import { PortalShell } from "./PortalShell";

export function AlertsPage() {
  return <PortalShell>{(card) => <AlertsView card={card} />}</PortalShell>;
}
