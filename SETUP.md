# Setup guide ❄️

Everything needed to run **Winter Confessions** locally and to publish it on GitHub Pages, from a
blank machine to a live site. Follow it top to bottom the first time; later, jump to the section
you need.

If you get stuck, check [Troubleshooting](#troubleshooting) first.

---

## 0. What you need

| Thing | Why | Notes |
| --- | --- | --- |
| **Node.js 20.19+** (22 recommended) | Builds and runs the app | `node -v` to check |
| A **Supabase** account (free) | Auth + Postgres database | [supabase.com](https://supabase.com) |
| A **GitHub** account (free) | Hosts the repo and the site | GitHub Pages |
| A **GoatCounter** account (optional, free) | Privacy-friendly visit counts | Leave out to run with no analytics |
| **git** | Push your code | `git --version` to check |

You do **not** need a domain, a server, or a credit card.

---

## 1. Run it locally

```bash
git clone https://github.com/shiro-devv/winter-confessions.git
cd winter-confessions
npm install
```

Create a file named `.env` in the project root (it is git-ignored, so it never gets committed):

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Optional — see step 5
# VITE_GOATCOUNTER_CODE=yourcode
```

The values come from step 2. Once `.env` is filled in:

```bash
npm run dev        # http://localhost:5173
```

> Open the app from `localhost` or an `https://` address. Supabase password handling and some Web
> Crypto APIs only work in a secure context.

---

## 2. Set up Supabase

### 2.1 Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a **New project**.
2. Pick a name, a database password (save it somewhere safe — you will not need it for this app,
   but you may want it later), and a region close to your users.
3. Wait a minute or two for the project to finish provisioning.

### 2.2 Copy the credentials

Open **Project Settings → API** (or the "Connect" button) and copy:

- **Project URL** → this is `VITE_SUPABASE_URL` (looks like `https://abcdefgh.supabase.co`).
- **Publishable key** (starts with `sb_publishable_`) → this is `VITE_SUPABASE_PUBLISHABLE_KEY`.

The publishable key is meant to be public; Row Level Security (below) is what protects the data.
**Never** put the `service_role` / secret key in this app or in a `VITE_*` variable.

### 2.3 Create the database objects

Open **SQL Editor → New query**, paste a whole file, and press **Run**.

**If this is a brand-new project**, run:

```
db/supabase.sql
```

That one file is the complete, idempotent setup: tables, Row Level Security, the signup trigger,
the seed prompts, the server-side functions (`send_confession`, `toggle_reaction`,
`reaction_summary`, `report_confession`), and the grants. Running it twice is safe.

**If your project already works** (tables and RPCs already exist), do **not** re-run the whole
file. Apply only the newer files in `db/migrations/`, oldest first:

```
db/migrations/20261110_supabase_grants.sql
db/migrations/20261115_reports.sql
```

> `db/schema.sql` is an older, separate document (the original browser-database model). It is not
> what the live app uses. `db/supabase.sql` is the file that matches Supabase.

After running the SQL you should see these tables under **Table Editor**: `profiles`, `prompts`,
`confessions`, `reactions`, `reports`.

Optional but worth doing once — confirm the anonymous sender id is not readable by clients:

```sql
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'confessions'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type, column_name;
```

`sender_fingerprint` should **not** appear. If it does, run
`db/migrations/20261110_supabase_grants.sql`, which revokes the leaky table-level grant and re-grants
only the safe columns.

### 2.4 Point Auth at your URLs

Go to **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:5173` while developing. Change it to your live URL
  (`https://shiro-devv.github.io/winter-confessions/`) after you deploy.
- **Redirect URLs:** add
  - `http://localhost:5173/**` for local development, and
  - `https://shiro-devv.github.io/winter-confessions/**` for the deployed site.

### 2.5 Decide how email confirmation works

By default Supabase sends a confirmation email on signup. The built-in mailer is rate-limited to a
few emails per hour, which is fine for a real launch but painful while testing.

- **While testing:** turn **Authentication → Providers → Email → Confirm email** off. New accounts
  can log in immediately.
- **For production:** turn it back on and, if you expect real traffic, configure **custom SMTP**
  (Authentication → Emails) so confirmation emails actually arrive. With confirmation on, the
  redirect URL from step 2.4 must be on the allow list or the confirmation link will bounce.

---

## 3. Verify locally

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serves the build at http://localhost:4173
```

Quick manual pass:

1. Open the app and choose **Claim your link**. Create an account (for example `@mika`).
2. Open your public page at `/u/mika` (use **Preview your public page** in the inbox).
3. Log out, then write a confession on that page. The snow should burst.
4. Log back in, open the inbox, reply, and make the reply **public**.
5. Visit `/u/mika` again: the answered confession appears, and you can react to it.
6. Click **Report** on the public answer, pick a reason, and send it. See step 6 to read it back.

There is also an automated smoke test against the services:

```bash
npx tsx scripts/smoke.mts
```

---

## 4. Security, consent, and legal pages

These ship already wired up. Nothing here is required to deploy, but review it before you go live.

- **Legal pages** live at `/terms`, `/privacy`, and `/cookies` and are linked from the footer.
- **Consent** is strict opt-in: nothing non-essential loads until the visitor accepts. The banner
  and the footer **Cookie settings** button manage it.
- **The facts** (operator name, contact email, effective date, minimum age) live in one place:
  `src/lib/legal.ts`. Change a value there and every page that mentions it updates. Replace the
  operator name and contact email with your own before launch.
- **CSP:** GitHub Pages cannot send response headers, so the Content Security Policy is injected
  into the production HTML at build time by the `securityMeta` plugin in `vite.config.ts`. It reads
  `VITE_SUPABASE_URL` to allow your exact project origin.
- **Vulnerability disclosure:** edit `public/.well-known/security.txt` and `SECURITY.md` to point at
  your contact address.

> The legal pages are a good-faith template, not legal advice. If you run this publicly or in a
> regulated region, have a lawyer review them.

---

## 5. Analytics (optional)

Analytics use [GoatCounter](https://www.goatcounter.com/), which is cookieless and needs no consent
banner under most interpretations — but this app still gates it behind the consent choice, so it
only ever loads after a visitor opts in.

1. Create a GoatCounter account and note your **site code** (the part before `.goatcounter.com`).
2. Set it in your environment:

   ```bash
   VITE_GOATCOUNTER_CODE=yourcode
   ```

3. Rebuild. With the variable set, the loader in `src/lib/analytics.ts` is available and the
   Cookie settings toggle turns on. With it unset, **no analytics script is ever requested**, and
   the settings dialog says so.

---

## 6. Reports and moderation

Anyone can flag a **public** confession, or one they received, with **Report**. Reports are written
to a private `reports` table that the browser can never read — only you can, through the Supabase
dashboard.

**To review reports:** open **Table Editor → `reports`** (newest first) or run:

```sql
select created_at, status, reason, details, confession_body
from public.reports
where status = 'open'
order by created_at desc;
```

Useful columns:

| Column | Meaning |
| --- | --- |
| `reason` | One of `harassment`, `hate`, `sexual`, `violence`, `self_harm`, `spam`, `other` |
| `details` | Optional note from the reporter (≤ 500 characters) |
| `confession_body` | A snapshot of the confession at report time, so the report survives deletion |
| `status` | `open` → `reviewing` → `resolved` / `dismissed` |

Update a report's status as you work through it:

```sql
update public.reports set status = 'resolved' where id = '<report-id>';
```

**To act on a confession:** find it in **Table Editor → `confessions`**. You can delete the row
directly (removes it for everyone), or reply/mark it read as the owner would. Deleting a confession
does **not** delete its reports; they keep the `confession_body` snapshot for your records.

Report reasons and the 5-per-hour limit are defined in
`db/migrations/20261115_reports.sql` (and mirrored in `db/supabase.sql`). Keep them in sync with
`src/services/reports.ts` if you change them.

---

## 7. Deploy to GitHub Pages

The repo already contains `.github/workflows/deploy.yml`, which builds on every push to `main` and
publishes `dist/` to GitHub Pages.

### 7.1 Create the repo and push

```bash
git add -A
git commit -m "Add legal pages, cookie consent, security, and reports"
git remote add origin https://github.com/<you>/winter-confessions.git   # if not set
git push -u origin main
```

> **Important:** `.env` is git-ignored. Never commit real credentials. The deployed build gets them
> from GitHub secrets/variables instead (next step).

### 7.2 Add the build secrets

In the repo, go to **Settings → Secrets and variables → Actions**. The workflow reads either tab,
so pick **Secrets** for anything sensitive. Add:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable key |
| `VITE_GOATCOUNTER_CODE` | Your GoatCounter code (optional) |

These are inlined into the client bundle at build time, which is expected: the publishable key is
public by design. The database is protected by Row Level Security, not by hiding the key.

### 7.3 Turn on Pages

Go to **Settings → Pages** and set **Source** to **GitHub Actions**.

Push to `main` (or run the workflow from the **Actions** tab) and watch the run. When it finishes,
the site is at:

```
https://<you>.github.io/winter-confessions/
```

Finally, go back to Supabase **Authentication → URL Configuration** and set the **Site URL** to that
address, keeping the localhost entries in the redirect list for future development.

### 7.4 If you use a different repo name or a custom domain

- **Different repo name:** change `base` in `vite.config.ts` to `'/<repo-name>/'`.
- **Custom domain:** add a `CNAME` file (in `public/`) with your domain, configure it under
  **Settings → Pages**, and update the Supabase Site URL and redirect list to match. The
  `base` can stay `/` for an apex domain.

---

## 8. Post-launch checklist

- [ ] `.env` is **not** committed (`git status` should not list it).
- [ ] `db/supabase.sql` (or the `db/migrations/` deltas) has been applied.
- [ ] `src/lib/legal.ts` shows **your** operator name and contact email.
- [ ] `SECURITY.md` and `public/.well-known/security.txt` show **your** contact.
- [ ] Supabase **Site URL** and **Redirect URLs** include the live `github.io` address.
- [ ] Email confirmation is on for production (and custom SMTP configured if you expect volume).
- [ ] GitHub Actions secrets/variables are set, and the deploy run is green.
- [ ] You can load a deep link like `/winter-confessions/u/<name>` directly (the `404.html` fallback
      handles this).
- [ ] You can send a confession, reply publicly, react, and file a report end to end.
- [ ] Analytics is either configured or intentionally left off (check the Cookie settings dialog).

---

## 9. Customizing

| I want to change… | Edit |
| --- | --- |
| Operator name, email, dates, minimum age | `src/lib/legal.ts` |
| Legal page wording | `src/pages/Terms.tsx`, `Privacy.tsx`, `Cookies.tsx` |
| Report reasons or limits | `src/services/reports.ts` **and** the SQL in `db/` |
| Rate limit for sending (3/min) | `db/supabase.sql` (`send_confession`) |
| Colors, fonts, layout | `src/styles.css` |
| CSP rules | `securityMeta` in `vite.config.ts` |
| Base path / repo name | `base` in `vite.config.ts` |

---

## 10. Troubleshooting

**The site loads but everything says it cannot reach the inbox.**
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are missing or wrong for the build you are
running. Check `.env` locally and the Actions secrets for the deployed build, then rebuild.

**"permission denied" or 400/401 on inbox reads.**
The grants in `db/migrations/20261110_supabase_grants.sql` were not applied (or the full
`db/supabase.sql` was skipped). Run them.

**Signup works but no profile row is created.**
The `on_auth_user_created` trigger is missing. Re-run `db/supabase.sql`, or at least the trigger
section.

**A confirmation email never arrives.**
The built-in mailer is rate-limited. Wait an hour, configure custom SMTP, or turn **Confirm email**
off while testing.

**A direct link to a route (like `/u/name`) 404s on GitHub Pages.**
Make sure the build ran `scripts/postbuild.mjs` (it is wired as `postbuild`, so `npm run build`
handles it) — it copies `index.html` to `404.html` and adds `.nojekyll`. If you built with a
different tool, replicate that.

**Reports always fail with "no longer available".**
The `reports` table / `report_confession` function is missing. Run
`db/migrations/20261115_reports.sql`.

**Analytics never loads.**
`VITE_GOATCOUNTER_CODE` is unset, or the visitor has not opted in. Both are intentional.

**Console shows a CSP violation for Supabase or fonts.**
Rebuild after setting `VITE_SUPABASE_URL`; the CSP reads it at build time. If you self-host fonts
later, add their origin to the `font-src` / `style-src` rules in `vite.config.ts`.

---

## 11. Going further

- Add password reset and email/social sign-in in Supabase Auth.
- Add a lightweight admin view (Supabase dashboard, or a small protected page) for reports.
- Swap the browser-stored anonymous id for something server-side if you need stronger abuse
  controls.
- Move to a custom domain and add a real `Content-Security-Policy` response header (which can also
  set `frame-ancestors`).

---

_This guide is documentation, not legal advice. Review the legal pages with a lawyer before
running the service publicly._
