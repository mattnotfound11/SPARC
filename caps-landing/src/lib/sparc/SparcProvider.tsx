"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { STORAGE_KEY, createSparcStore, type SparcState, type SparcStorage, type SparcStore } from "./store";

const StoreContext = createContext<SparcStore | null>(null);

const subscribeNever = () => () => {};

/** localStorage can throw (blocked cookies, some private modes); then the data just stays in memory. */
function browserStorage(): SparcStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Holds the console's data store. The store is created on the client after mount
 * (the seed depends on the current time), so server HTML never disagrees with it.
 */
export function SparcProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const store = useMemo(() => (mounted ? createSparcStore(undefined, browserStorage()) : null), [mounted]);

  // Another tab (say the landing page next to the console) saved a change: show it here too.
  useEffect(() => {
    if (!store) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) store.refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** Null until the client store exists. */
export function useSparcStoreOrNull() {
  return useContext(StoreContext);
}

export function useSparcStore(): SparcStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useSparcStore must be used inside <SparcGate>.");
  return store;
}

export function useSparcState(): SparcState {
  const store = useSparcStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/** Renders `fallback` until data is ready, then the children. */
export function SparcGate({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const store = useContext(StoreContext);
  if (!store) return <>{fallback}</>;
  return <>{children}</>;
}

/** A clock for relative timestamps; re-renders every `ms`. */
export function useNow(ms = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
