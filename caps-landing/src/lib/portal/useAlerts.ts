"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useSparcStoreOrNull } from "@/lib/sparc/SparcProvider";
import { floorStats } from "@/lib/sparc/selectors";
import { cardKey, type SparcState } from "@/lib/sparc/store";
import { noticesFor, type GateContext } from "./notifications";
import { usePortalState } from "./usePortal";

const none = () => () => {};

/** The console store's data, or null until it exists (it is created after hydration). */
export function useSparcStateOrNull(): SparcState | null {
  const store = useSparcStoreOrNull();
  return useSyncExternalStore(store ? store.subscribe : none, store ? store.getState : () => null, () => null);
}

/** Free bays in the whole building right now. */
export function freeBays(slots: SparcState["slots"] | undefined): number {
  return (slots ?? []).filter((s) => s.status === "free").length;
}

/** The registered driver behind a campus card, and the bay they are parked in, if any. */
export function useParkedBay(card: string) {
  const sparc = useSparcStateOrNull();
  if (!sparc) return { ready: false as const };
  const user = sparc.users.find((u) => cardKey(u.nfcId) === card);
  const slot = user ? sparc.slots.find((s) => s.occupant?.userId === user.id) : undefined;
  return { ready: true as const, user, slot, free: freeBays(sparc.slots), now: sparc.now };
}

/* When the driver last opened their alerts, per card. Anything newer counts as unread. */
const seenKey = (card: string) => `sparc_portal_seen_${card}`;
const SEEN_EVENT = "sparc-portal-seen";

const subscribeSeen = (fn: () => void) => {
  window.addEventListener(SEEN_EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(SEEN_EVENT, fn);
    window.removeEventListener("storage", fn);
  };
};

function readSeen(card: string) {
  try {
    return Number(localStorage.getItem(seenKey(card)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function markAlertsSeen(card: string) {
  try {
    localStorage.setItem(seenKey(card), String(Date.now()));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(SEEN_EVENT));
}

export function useAlerts(card: string) {
  const state = usePortalState();
  const sparc = useSparcStateOrNull();
  const seen = useSyncExternalStore(subscribeSeen, () => readSeen(card), () => 0);
  const gate = useMemo<GateContext>(() => {
    if (!sparc) return { free: 0 };
    const user = sparc.users.find((u) => cardKey(u.nfcId) === card);
    const slot = user ? sparc.slots.find((s) => s.occupant?.userId === user.id) : undefined;
    return {
      free: freeBays(sparc.slots),
      expiresAt: user?.expiresAt,
      parkedSince: slot?.occupant?.since,
      fullFloors: floorStats(sparc.config, sparc.slots).filter((f) => f.free === 0).map((f) => f.floor),
    };
  }, [sparc, card]);
  const notices = useMemo(() => noticesFor(state, card, gate), [state, card, gate]);
  return { notices, unread: notices.filter((n) => n.at > seen).length, seen };
}
