import type { SupabaseClient } from "@supabase/supabase-js";

export type Availability = { free: number; total: number };

const TABLE = "sparc_availability";
const ROW = "main";

let clientPromise: Promise<SupabaseClient | null> | undefined;

/**
 * The app's one Supabase client, or null when Supabase isn't configured (the count then stays local
 * to each browser). Loaded on demand so the public homepage only downloads the library when it needs it.
 */
export function sharedClient(): Promise<SupabaseClient | null> {
  clientPromise ??= import("@/lib/supabase/client").then((m) => m.getSupabase());
  return clientPromise;
}

export function toAvailability(row: unknown): Availability | null {
  const r = row as Partial<Availability> | null;
  return r && Number.isInteger(r.free) && Number.isInteger(r.total) ? { free: r.free!, total: r.total! } : null;
}

/** Console side: publish the count after every change. Skips repeats; failures are ignored (local count still works). */
export function createPublisher(getClient: () => Promise<SupabaseClient | null> = sharedClient) {
  let last: string | null = null;
  return async function publish(a: Availability) {
    const sig = `${a.free}/${a.total}`;
    if (sig === last) return;
    last = sig;
    const client = await getClient();
    if (!client) return;
    const { error } = await client.from(TABLE).upsert({ id: ROW, free: a.free, total: a.total, updated_at: new Date().toISOString() });
    if (error) last = null;
  };
}

/** Landing side: current count, then every change as it is pushed. Returns an unsubscribe. */
export function watchAvailability(onChange: (a: Availability) => void, getClient: () => Promise<SupabaseClient | null> = sharedClient) {
  let stopped = false;
  let cleanup = () => {};
  void getClient().then(async (client) => {
    if (!client || stopped) return;
    const channel = client
      .channel("sparc-availability")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, (p) => {
        const a = toAvailability(p.new);
        if (a) onChange(a);
      })
      .subscribe();
    cleanup = () => void client.removeChannel(channel);
    const { data } = await client.from(TABLE).select("free,total").eq("id", ROW).maybeSingle();
    const a = toAvailability(data);
    if (a && !stopped) onChange(a);
  });
  return () => {
    stopped = true;
    cleanup();
  };
}
