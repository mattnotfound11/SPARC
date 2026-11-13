"use client";

import { useEffect, useState } from "react";
import { createPublisher, watchAvailability, type Availability } from "./shared";
import { useSparcStoreOrNull } from "./SparcProvider";
import { buildingTotals, floorStats } from "./selectors";

/** Console only: push the free/total count to everyone watching, right after each change. */
export function usePublishAvailability() {
  const store = useSparcStoreOrNull();
  useEffect(() => {
    if (!store) return;
    const publish = createPublisher();
    // Also send the count as of now: a ?nfc= tap lands in a child effect before this one subscribes.
    const send = () => {
      const s = store.getState();
      const { free, total } = buildingTotals(floorStats(s.config, s.slots));
      void publish({ free, total });
    };
    send();
    return store.subscribe(send);
  }, [store]);
}

/** The count pushed from the scanner, or null until one arrives (or when no shared backend is configured). */
export function useSharedAvailability(): Availability | null {
  const [shared, setShared] = useState<Availability | null>(null);
  useEffect(() => watchAvailability(setShared), []);
  return shared;
}
