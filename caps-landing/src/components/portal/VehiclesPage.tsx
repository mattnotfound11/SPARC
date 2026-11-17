"use client";

import { PortalShell } from "./PortalShell";
import { ForecastCard } from "./ForecastCard";
import { VehiclesView } from "./VehiclesView";

export function VehiclesPage() {
  return <PortalShell>{(card) => (
        <div className="space-y-5">
          <VehiclesView card={card} />
          <ForecastCard />
        </div>
      )}</PortalShell>;
}
