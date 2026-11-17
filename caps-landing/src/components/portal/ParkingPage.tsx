"use client";

import { ParkingView } from "./ParkingView";
import { PortalShell } from "./PortalShell";

export function ParkingPage() {
  return <PortalShell>{(card) => <ParkingView card={card} />}</PortalShell>;
}
