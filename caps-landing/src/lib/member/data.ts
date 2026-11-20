import { getSupabase } from "@/lib/supabase/client";
import { logFromRow, userFromRow } from "@/lib/supabase/sync";
import { createSparcStore, type SparcStorage } from "@/lib/sparc/store";
import type { LogEntry, RegisteredUser } from "@/lib/sparc/types";
import { SUGGESTION_DAILY_LIMIT, validateSuggestion, type SuggestionCategory } from "./logic";

/*
 * Member data. With Supabase configured these are direct queries; the database's row-level
 * security (supabase/lock-down.sql) is what confines a member to their own rows. Without it
 * (development) they read the sample store in localStorage, and the demo member is the first student.
 */

export type MemberData = { user: RegisteredUser; logs: LogEntry[] };
export type SuggestionStatus = "new" | "read" | "resolved";
export type Suggestion = {
  id: string;
  registeredUserId: string;
  userName: string;
  category: SuggestionCategory;
  message: string;
  createdAt: number;
  status: SuggestionStatus;
};

type Deps = { storage?: SparcStorage; now?: number };
const OFFLINE = "Couldn't reach the database. Check your connection and try again.";
const MOCK_KEY = "sparc_suggestions_v1";
const DAY_MS = 24 * 60 * 60 * 1000;

function localStorageOrUndefined(): SparcStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Database client, unless a test (or no Supabase) means the local sample data is used instead. */
const backend = (deps?: Deps) => (deps?.storage ? null : getSupabase());

function mockUser(deps?: Deps): { user: RegisteredUser; logs: LogEntry[] } | null {
  const storage = deps?.storage ?? localStorageOrUndefined();
  const store = createSparcStore(deps?.now ?? Date.now(), storage);
  if (store.getState().logs.length === 0) store.loadSample();
  const { users, logs } = store.getState();
  const user = users.find((u) => u.role === "student") ?? users.find((u) => u.role !== "visitor");
  return user ? { user, logs: logs.filter((l) => l.userId === user.id) } : null;
}

export async function loadMemberData(deps?: Deps): Promise<MemberData | null> {
  const db = backend(deps);
  if (!db) return mockUser(deps);
  const { data: me, error: meError } = await db.rpc("member_user_id");
  if (meError) throw new Error(OFFLINE);
  if (!me) return null;
  const [user, logs] = await Promise.all([
    db.from("users").select("*").eq("id", me).maybeSingle(),
    db.from("logs").select("*").eq("user_id", me).order("at", { ascending: false }).limit(500),
  ]);
  if (user.error || logs.error) throw new Error(OFFLINE);
  if (!user.data) return null;
  return { user: userFromRow(user.data), logs: (logs.data ?? []).map(logFromRow) };
}

function readMock(storage: SparcStorage | undefined): Suggestion[] {
  try {
    const raw = storage?.getItem(MOCK_KEY);
    return raw ? (JSON.parse(raw) as Suggestion[]) : [];
  } catch {
    return [];
  }
}
function writeMock(storage: SparcStorage | undefined, rows: Suggestion[]) {
  try {
    storage?.setItem(MOCK_KEY, JSON.stringify(rows));
  } catch {
    /* storage blocked: lost on reload */
  }
}

/** Error message for the member, or null once the suggestion is sent. */
export async function sendSuggestion(category: string, message: string, deps?: Deps): Promise<string | null> {
  const invalid = validateSuggestion(category, message);
  if (invalid) return invalid;
  const text = message.trim();
  const now = deps?.now ?? Date.now();
  const limitMessage = `You can send up to ${SUGGESTION_DAILY_LIMIT} suggestions a day. Try again tomorrow.`;
  const db = backend(deps);
  if (!db) {
    const storage = deps?.storage ?? localStorageOrUndefined();
    const me = mockUser(deps);
    if (!me) return "Your pass isn't linked yet.";
    const rows = readMock(storage);
    if (rows.filter((r) => r.registeredUserId === me.user.id && r.createdAt > now - DAY_MS).length >= SUGGESTION_DAILY_LIMIT) return limitMessage;
    rows.push({ id: `s${now}-${rows.length}`, registeredUserId: me.user.id, userName: me.user.name, category: category as SuggestionCategory, message: text, createdAt: now, status: "new" });
    writeMock(storage, rows);
    return null;
  }
  const { data: me } = await db.rpc("member_user_id");
  if (!me) return "Your pass isn't linked yet.";
  const { error } = await db.from("suggestions").insert({ registered_user_id: me, category, message: text, created_at: now });
  if (!error) return null;
  // The database refuses the sixth in 24 hours (row-level rule); anything else is a connection problem.
  return error.code === "42501" ? limitMessage : OFFLINE;
}

const fromRow = (r: Record<string, unknown>, names: Map<string, string>): Suggestion => ({
  id: String(r.id),
  registeredUserId: String(r.registered_user_id),
  userName: names.get(String(r.registered_user_id)) ?? "Member",
  category: r.category as SuggestionCategory,
  message: String(r.message),
  createdAt: Number(r.created_at),
  status: r.status as SuggestionStatus,
});

const newestFirst = (a: Suggestion, b: Suggestion) => b.createdAt - a.createdAt;

/** The signed-in member's own suggestions (the database only returns theirs). */
export async function listMySuggestions(deps?: Deps): Promise<Suggestion[]> {
  const db = backend(deps);
  if (!db) {
    const me = mockUser(deps);
    return readMock(deps?.storage ?? localStorageOrUndefined()).filter((r) => r.registeredUserId === me?.user.id).sort(newestFirst);
  }
  const { data: me } = await db.rpc("member_user_id");
  if (!me) return [];
  const { data, error } = await db.from("suggestions").select("*").eq("registered_user_id", me).order("created_at", { ascending: false });
  if (error) throw new Error(OFFLINE);
  return (data ?? []).map((r) => fromRow(r, new Map()));
}

/** Everyone's suggestions, for the administrator inbox. */
export async function listAllSuggestions(deps?: Deps): Promise<Suggestion[]> {
  const db = backend(deps);
  if (!db) return readMock(deps?.storage ?? localStorageOrUndefined()).sort(newestFirst);
  const [rows, users] = await Promise.all([
    db.from("suggestions").select("*").order("created_at", { ascending: false }).limit(500),
    db.from("users").select("id, name"),
  ]);
  if (rows.error || users.error) throw new Error(OFFLINE);
  const names = new Map((users.data ?? []).map((u) => [String(u.id), String(u.name)]));
  return (rows.data ?? []).map((r) => fromRow(r, names));
}

export async function setSuggestionStatus(id: string, status: SuggestionStatus, deps?: Deps): Promise<string | null> {
  const db = backend(deps);
  if (!db) {
    const storage = deps?.storage ?? localStorageOrUndefined();
    writeMock(storage, readMock(storage).map((r) => (r.id === id ? { ...r, status } : r)));
    return null;
  }
  const { error } = await db.from("suggestions").update({ status }).eq("id", id);
  return error ? OFFLINE : null;
}
