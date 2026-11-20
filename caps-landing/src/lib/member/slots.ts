import { getSupabase } from "@/lib/supabase/client";
import type { Slot } from "@/lib/sparc/types";

/** The lot's bays (free or taken, nobody's name) for the member dashboard. Null when it can't be read. */
export async function loadSlotMap(): Promise<Slot[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db.rpc("member_slot_map");
  if (error || !Array.isArray(data)) return null;
  return (data as { code: string; floor: number; idx: number; status: string }[]).map((r) => ({
    code: r.code,
    floor: Number(r.floor),
    index: Number(r.idx),
    status: r.status === "occupied" ? "occupied" : "free",
  }));
}
