import { DEMO_ACCOUNTS } from "./mockSession";

/**
 * Demo staff logins printed under the sign-in button so a panel or evaluator can get in. They must
 * match real accounts: create them in Supabase (Authentication -> Users) and list them in the `admins`
 * and `facilitators` tables, see docs/supabase-setup.md.
 *
 * This is a demo system, so they are shown everywhere by default. Set NEXT_PUBLIC_HIDE_STAFF_LOGINS=true
 * (and redeploy) to hide the box, and change the passwords, before real students are registered:
 * anyone who can see the sign-in page can sign in with these.
 */
export const STAFF_LOGIN_PASSWORD = "sparc-demo";

const hidden = process.env.NEXT_PUBLIC_HIDE_STAFF_LOGINS === "true";

export const STAFF_LOGINS = hidden
  ? []
  : DEMO_ACCOUNTS.map((a) => ({
      label: a.role === "admin" ? "Administrator" : "Facilitator",
      email: a.email,
      password: STAFF_LOGIN_PASSWORD,
    }));
