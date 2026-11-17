"use client";

import { useSyncExternalStore } from "react";
import { cardKey } from "@/lib/sparc/store";
import { portal } from "./store";
import type { PortalState } from "./types";

const EMPTY: PortalState = { vehicles: [], activeVehicle: {}, violations: [], appeals: [], passes: [] };

/** Portal data. Empty on the server and during hydration, so markup always matches. */
export function usePortalState(): PortalState {
  return useSyncExternalStore(portal.subscribe, portal.get, () => EMPTY);
}

/* The driver's card, remembered in this browser. A prototype sign-in until the backend has driver accounts. */
const CARD_KEY = "sparc_portal_card";
const CARD_EVENT = "sparc-portal-card";

const subscribeCard = (fn: () => void) => {
  window.addEventListener(CARD_EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(CARD_EVENT, fn);
    window.removeEventListener("storage", fn);
  };
};
const readCard = () => {
  try {
    return localStorage.getItem(CARD_KEY) ?? "";
  } catch {
    return "";
  }
};

/** null while loading, "" when no card is set. */
export function useDriverCard(): string | null {
  return useSyncExternalStore(subscribeCard, readCard, () => null);
}

export function setDriverCard(value: string) {
  const key = cardKey(value);
  try {
    if (key) localStorage.setItem(CARD_KEY, key);
    else localStorage.removeItem(CARD_KEY);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(CARD_EVENT));
}
