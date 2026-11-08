"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createSparcStore, type SparcState, type SparcStore } from "./store";

/** The simulated gate feed ticks well inside the proposal's 10-second refresh ceiling. */
export const FEED_INTERVAL_MS = 4000;

const StoreContext = createContext<SparcStore | null>(null);

const subscribeNever = () => () => {};

/**
 * Holds the console's data store. The store is created on the client after mount
 * (the seed depends on the current time), so server HTML never disagrees with it.
 */
export function SparcProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const store = useMemo(() => (mounted ? createSparcStore() : null), [mounted]);
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

/** Renders `fallback` until data is ready, then the children, and drives the simulated gate feed. */
export function SparcGate({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const store = useContext(StoreContext);
  if (!store) return <>{fallback}</>;
  return (
    <>
      <FeedDriver store={store} />
      {children}
    </>
  );
}

function FeedDriver({ store }: { store: SparcStore }) {
  const live = useSyncExternalStore(
    store.subscribe,
    () => store.getState().live,
    () => store.getState().live,
  );
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => store.tick(), FEED_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [store, live]);
  return null;
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
