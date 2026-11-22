import { DEMO_ACCOUNTS } from "./mockSession";

/**
 * Demo staff logins printed under the sign-in button so a panel or evaluator can get in while
 * developing. These must match real accounts (docs/supabase-setup.md).
 *
 * They exist only in development. A production build leaves both the box and the password out of the
 * shipped code, because anyone who can open the sign-in page could otherwise sign in as staff.
 * NEXT_PUBLIC_HIDE_STAFF_LOGINS=true still hides them in development too.
 */
export const STAFF_LOGINS =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_HIDE_STAFF_LOGINS !== "true"
    ? DEMO_ACCOUNTS.map((a) => ({
        label: a.role === "admin" ? "Administrator" : "Facilitator",
        email: a.email,
        password: "sparc-demo",
      }))
    : [];
