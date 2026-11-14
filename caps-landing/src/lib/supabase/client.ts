import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// New projects issue "publishable" keys (sb_publishable_…); older ones still have the "anon" JWT.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when the build was given Supabase settings. Use this (not `getSupabase()`) for anything that
 * affects rendered markup: it is the same on the server and in the browser.
 */
export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * The one shared browser client (one sign-in session, one realtime socket), or null when Supabase
 * isn't configured. Always null during the static build's prerender, so nothing is created in Node.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  client ??= createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
