import { getSupabase } from "@/lib/supabase/client";

/** Links a Supabase account (by email) to a registered user so they can sign in as that member. Error message, or null on success. */
export async function linkMemberLogin(email: string, registeredUserId: string): Promise<string | null> {
  const typed = email.trim();
  if (!typed || !typed.includes("@")) return "Enter the member's email address.";
  const db = getSupabase();
  if (!db) return "Member logins need the shared database. In development, sign in with the demo member instead.";
  const { data, error } = await db.rpc("link_member", { p_email: typed, p_user_id: registeredUserId });
  if (error) return "Couldn't reach the database. Try again.";
  return data === "ok" ? null : String(data);
}
