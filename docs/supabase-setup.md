# Connecting SPARC to Supabase

One person (the **project owner**) does steps 1 to 4. Everyone who works on the app does step 5.
Budget about 15 minutes.

> **The database is public for now (the team's decision).** Anyone who has the website's public key
> can read **and change** everything in it, including drivers' names and student IDs. That's fine for
> a demo with made-up data. Before real students are registered, follow **"Locking it down"** at the
> bottom.

> ⚠️ **Free plan:** Supabase pauses a free project after **1 week of inactivity**, and the site
> stops saving until someone clicks **Restore** in the dashboard. Open the console at least once a
> week, and always the day before a demo.

---

## 1. Create the project (owner)

1. Go to **https://supabase.com** and sign in ("Continue with GitHub" is easiest).
2. Click **New project**. If asked for an organization, create one, for example `SPARC Team`.
3. Fill in the form:
   | Field | What to enter |
   |---|---|
   | Project name | `SPARC` |
   | Database password | **Generate a password** and save it somewhere safe. The app doesn't use it, but you can't see it again. |
   | Region | **Southeast Asia (Singapore)**, the closest to Iloilo |
   | Plan | Free |
4. Click **Create new project** and wait 1–2 minutes until the dashboard loads.

## 2. Build the database (owner)

1. In the left sidebar open **SQL Editor** and click **New query**.
2. Open `supabase/schema.sql` from this repo, copy **all** of it, paste it in, and click **Run**.
3. You should see **"Success. No rows returned."** It's safe to run again if you're unsure.
4. Check it: **Table Editor** → `slots` should have **110 rows**.

## 3. Add Matthew and Alex to the project (owner)

1. Click the organization name at the top left and open its **Team** settings
   (https://supabase.com/dashboard/org/_/team).
2. Click **Invite**, enter Matthew's email, and choose **Administrator**. Repeat for Alex.
   Free plans allow unlimited team members with the Owner, Administrator and Developer roles.
   - **Administrator**: everything except changing the organization's own settings.
   - **Developer**: can see data and run SQL, but can't change Auth or API settings.
3. They get an email. **The invite expires after 24 hours**, so ask them to accept it soon.

## 4. Copy the two values the app needs (owner)

1. On the project page click **Connect** at the top. You can also find the key under
   **Settings → API Keys**.
2. Copy the **Project URL**, like `https://abcdefghijklmnop.supabase.co`.
3. Copy the **publishable key**, which starts with `sb_publishable_`.
   - It's meant to be public, so sharing it in the group chat is fine.
   - **Never share the secret key** (`sb_secret_…`) or the database password.

## 5. Connect the app (everyone)

**On your computer**

1. In the `caps-landing` folder copy `.env.example` to a new file named `.env.local`.
2. Fill in the two values (no quotes, no spaces around `=`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
   ```
   Leave `NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN=false`.
3. Stop the dev server (Ctrl + C) and run `npm run dev` again. The values are read only at start-up.
4. Open http://localhost:3000/admin. No login is needed. **Live status** should show **110 / 110**.

**On the live site (Vercel)**

1. Project → **Settings → Environment Variables**. Set the same two names and values for
   **Production**, **Preview** and **Development**. If the old project's values are there, replace them.
2. **Deployments** → **⋯** on the latest one → **Redeploy**. The values are built into the site, so
   changing them does nothing until it's rebuilt.

---

## Check it works

1. Open `/admin` on a laptop, on **Live status**.
2. On the Android phone (Chrome), open **Entry / Exit** and tap a registered card.
3. Within a second or two the laptop shows **109** and the driver appears in **Recent activity**,
   without reloading.
4. In Supabase, **Table Editor → logs** shows the entry.
5. Open the public homepage on another device. Its slot count matches.

## If something goes wrong

| What you see | Likely cause | Fix |
|---|---|---|
| Console shows demo data and nothing is shared | `.env.local` missing, mistyped, or the dev server wasn't restarted | Step 5, and restart `npm run dev` |
| Red banner: "Can't reach the database…" | Wrong URL or key, or the project is paused | Recheck step 4; in Supabase click **Restore** if it says paused |
| Banner: "Live updates are disconnected…" | Realtime isn't on, or the connection dropped | Rerun `schema.sql` (it switches live updates on) and check your internet |
| Banner: "Another gate just used slot …" | Two gates tapped for the same slot at once. Working as intended | Tap the card again |
| Console loads but 0 slots | `schema.sql` didn't finish | Rerun step 2 and look for a red error |
| Live site still shows demo data | Not rebuilt after setting variables | Redeploy (step 5, Vercel) |

---

## Locking it down (before real students are registered)

1. In Supabase: **Authentication → Users → Add user → Create new user**. Enter an email and
   password, and tick **Auto Confirm User**. Do this for each admin.
2. **SQL Editor** → run this with the real emails:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users
   where email in ('you@usa.edu.ph', 'matthew@usa.edu.ph', 'alex@usa.edu.ph')
   on conflict do nothing;
   ```
3. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up" and **Save**.
4. In Vercel set `NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN=true` and **Redeploy**. Wait until the new
   deployment is live. (The same line goes in `.env.local` for local testing.)
5. **Only then**, run `supabase/lock-down.sql` in the SQL Editor.

After that, the console asks for an email and password, and the database refuses everyone who isn't
on the admin list. The public homepage still shows the live count.

**Order matters:** if you run the lock-down before step 4 is live, the console stops saving until you
finish.
