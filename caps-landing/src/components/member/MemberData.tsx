"use client";

import { useEffect, useMemo, useState } from "react";
import { SparcStoreProvider } from "@/lib/sparc/SparcProvider";
import { createSparcStore, uniqueId, type SparcStore } from "@/lib/sparc/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { loadSlotMap } from "@/lib/member/slots";

const REFRESH_MS = 15000;

/**
 * Gives the member's 3D map and live count their data. Without Supabase (development) the local demo
 * store from the root layout is used as is. With it, the store holds only the bays' free/taken state,
 * read through a function that carries no names, and is refreshed every few seconds.
 */
export function MemberData({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <>{children}</>;
  return <Remote signedIn={signedIn}>{children}</Remote>;
}

function Remote({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const store = useMemo(() => (signedIn ? createSparcStore(undefined, undefined, { newId: uniqueId }) : null), [signedIn]);
  const [loaded, setLoaded] = useState<SparcStore | null>(null);

  useEffect(() => {
    if (!store) return;
    let alive = true;
    const pull = async () => {
      const slots = await loadSlotMap();
      if (!alive || !slots) return;
      store.hydrate({ slots, users: [], logs: [], scans: [] });
      setLoaded(store);
    };
    void pull();
    const id = window.setInterval(pull, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [store]);

  return <SparcStoreProvider store={store && loaded === store ? store : null}>{children}</SparcStoreProvider>;
}
