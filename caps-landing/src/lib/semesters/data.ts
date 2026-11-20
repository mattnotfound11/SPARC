import { getSupabase } from "@/lib/supabase/client";
import { defaultSemesters, validateSemesters, type Semester } from "./semesters";

/*
 * Where the semester calendar lives. With Supabase configured it is the `semesters` table (shared by
 * every admin device). Without it (development) it is kept in the browser, starting from example dates
 * so the demo runs. The real database starts empty: nothing is guessed for the school.
 */

type Storage = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };
type Deps = { storage?: Storage; now?: number };

const KEY = "sparc_semesters_v1";
const OFFLINE = "Couldn't reach the database. Check your connection and try again.";

const byStart = (a: Semester, b: Semester) => a.startsAt - b.startsAt;

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** The database client, unless a test (or no Supabase) means the browser copy is used instead. */
const backend = (deps?: Deps) => (deps?.storage ? null : getSupabase());

export async function loadSemesters(deps?: Deps): Promise<Semester[]> {
  const db = backend(deps);
  if (db) {
    const { data, error } = await db.from("semesters").select("*").order("starts_at", { ascending: true });
    if (error) throw new Error(OFFLINE);
    return (data ?? []).map((r) => ({ id: String(r.id), name: String(r.name), startsAt: Number(r.starts_at), endsAt: Number(r.ends_at) }));
  }
  const storage = deps?.storage ?? browserStorage();
  try {
    const raw = storage?.getItem(KEY);
    if (raw) return (JSON.parse(raw) as Semester[]).sort(byStart);
  } catch {
    /* unreadable: fall back to the example dates */
  }
  return defaultSemesters(deps?.now ?? Date.now());
}

/** Replaces the whole calendar. Resolves to an error message for the admin, or null once it is saved. */
export async function saveSemesters(semesters: Semester[], deps?: Deps): Promise<string | null> {
  const invalid = validateSemesters(semesters);
  if (invalid) return invalid;
  const sorted = [...semesters].sort(byStart);
  const db = backend(deps);
  if (db) {
    const existing = await db.from("semesters").select("id");
    if (existing.error) return OFFLINE;
    const keep = new Set(sorted.map((s) => s.id));
    const gone = (existing.data ?? []).map((r) => String(r.id)).filter((id) => !keep.has(id));
    if (gone.length) {
      const removed = await db.from("semesters").delete().in("id", gone);
      if (removed.error) return OFFLINE;
    }
    if (sorted.length) {
      const saved = await db.from("semesters").upsert(sorted.map((s) => ({ id: s.id, name: s.name.trim(), starts_at: s.startsAt, ends_at: s.endsAt })));
      if (saved.error) return OFFLINE;
    }
    return null;
  }
  try {
    (deps?.storage ?? browserStorage())?.setItem(KEY, JSON.stringify(sorted));
  } catch {
    /* storage blocked: the change lasts until the page is closed */
  }
  return null;
}
