"use client";

import { useEffect, useMemo, useState } from "react";
import { SparcStoreProvider } from "@/lib/sparc/SparcProvider";
import { createSparcStore, uniqueId, type SparcStore } from "@/lib/sparc/store";
import { usePublishAvailability } from "@/lib/sparc/useShared";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { startSync } from "@/lib/supabase/sync";

const LIVE_LOST = "Live updates are disconnected, so this screen may be behind other devices. Reconnecting…";

/** Pushes the console's free/total count to the public homepage after every change. */
function PublishCount() {
  usePublishAvailability();
  return null;
}

/**
 * The console's data. With Supabase configured, this swaps in a store that mirrors the shared
 * database (loaded once the admin is signed in, with ids no other device can produce) and shows a
 * notice when the connection has a problem. Without Supabase, the console keeps using the local
 * store from the root layout, so development needs no setup.
 */
export function ConsoleData({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <>
        <PublishCount />
        {children}
      </>
    );
  }
  return <RemoteData signedIn={signedIn}>{children}</RemoteData>;
}

function RemoteData({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  // One store per sign-in. Nothing is created (or loaded) for a visitor on the way to the login page.
  const store = useMemo(() => (signedIn ? createSparcStore(undefined, undefined, { newId: uniqueId }) : null), [signedIn]);
  const [loadedStore, setLoadedStore] = useState<SparcStore | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  useEffect(() => {
    const db = getSupabase();
    if (!store || !db) return;
    return startSync(store, db, {
      onLoaded: () => setLoadedStore(store),
      onProblem: setProblem,
      onLiveChange: setLive,
    });
  }, [store]);

  // Views only see the store after its first load, so nobody acts on the local seed data.
  const ready = store && loadedStore === store ? store : null;
  const notice = ready ? (problem ?? (live ? null : LIVE_LOST)) : null;
  return (
    <SparcStoreProvider store={ready} notice={notice}>
      <PublishCount />
      {children}
    </SparcStoreProvider>
  );
}
