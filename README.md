# Winter Confessions ❄️

An anonymous confessions app with falling snow, built with **React + TypeScript**.
Claim a link, share it, and read the confessions your friends send without ever seeing a name.

The layout follows the same idea as ngl.link (a hero, a ribbon of prompts, a "how it works"
section, and a bold send card), but the name, copy, colors, and artwork are all original.

- **Primary color:** `#D8CBB3` (warm sand)
- **Secondary color:** `#2F6BFF` (winter blue)
- **Snow:** a full-screen canvas particle system that falls over every page

---

## Quick start

Requires Node.js 20.19 or newer (22 recommended). Built and tested on Node 22.

```bash
npm install
npm run dev        # http://localhost:5173
```

### Supabase setup

The app uses Supabase for Auth and Postgres. Add your project credentials to `.env`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Then apply the SQL in `db/migrations/` to the project (SQL editor or `psql`). In the Supabase
dashboard, set **Authentication → URL Configuration → Site URL** to `http://localhost:5173` and
add `http://localhost:5173/**` to the redirect allow list.

> Supabase's built-in mailer only sends a couple of confirmation emails per hour. For local
> testing, either configure custom SMTP or turn **Confirm email** off under
> **Authentication → Providers → Email**.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks, then makes a production build in `dist/` |
| `npm run preview` | Serves the production build on `http://localhost:4173` |
| `npm run typecheck` | Type-checks only |
| `npx tsx scripts/smoke.mts` | Runs 32 checks against the database and services |

> Open the app from `localhost` or an `https` address. Password hashing uses the Web Crypto API,
> which browsers only allow in secure contexts.

### Try it in 60 seconds

1. Open the app and choose **Claim your link**. Create an account, for example `@mika`.
2. Open your public page at `/u/mika` (use **Preview your public page** in the inbox).
3. Log out, then write a confession on that page. Watch the snow burst.
4. Log back in, open your inbox, reply, and tick **Show this reply on my public page**.
5. Visit `/u/mika` again to see the answered confession and react to it.

---

## Features

**Visitors (no account needed)**
- Send an anonymous confession to any username (up to 500 characters)
- Pick a starter prompt: ask me anything, never have I ever, confessions, three words
- Browse and react (❄️ 💙 😮) to confessions the owner answered publicly

**Account owners**
- Sign up and log in with an email and password (the username becomes the public link)
- A private inbox with All, Unread, and Answered filters
- Reply to confessions, privately or publicly
- Mark as read, mark all as read, delete (with a clear confirmation step)
- Copy or share your link, and edit your display name and bio

**Look and feel**
- Snow particles over the whole app, plus an extra flurry when a confession is sent
- Animations on every page (see [Animations](#animations))
- Fully responsive, from 360px phones to wide desktops
- Keyboard friendly, with a skip link, visible focus rings, and screen reader labels

---

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict mode) |
| Build | Vite |
| Routing | React Router |
| Animation | Framer Motion, plus CSS keyframes for the marquee |
| Snow | Hand-written Canvas 2D particle system (no library) |
| Styling | One plain CSS file with design tokens (CSS variables) |
| Data | Supabase Auth + Postgres (`db/schema.sql`, `db/migrations/`) |

---

## Project structure

```
winter-confessions/
├── db/schema.sql              PostgreSQL version of the data model
├── scripts/smoke.mts          Service-layer checks (run with tsx)
├── public/favicon.svg
├── index.html
└── src/
    ├── main.tsx               Providers: router, motion, toasts, auth
    ├── App.tsx                Routes + page transitions + snow
    ├── styles.css             Tokens, layout, components, responsive rules
    ├── db/                    Legacy browser DB (kept for shared helpers)
    │   ├── errors.ts          AppError with friendly messages
    │   └── ...                Old local-storage tables, no longer used by the app
    ├── services/              Business rules (the future "API")
    │   ├── auth.ts            Supabase signUp, logIn, logOut, profiles
    │   ├── confessions.ts     send, inbox, reply, delete, reactions, rate limit
    │   ├── crypto.ts          Random ids for the anonymous visitor fingerprint
    │   ├── validation.ts      Limits and input rules
    │   └── visitor.ts         Anonymous per-browser id
    ├── hooks/                 Supabase auth context, toasts, document title
    ├── components/            SnowCanvas, Navbar, Marquee, Reveal, ConfessionCard...
    ├── pages/                 Landing, Auth, Send, Inbox, NotFound
    └── lib/                   Time formatting, clipboard and share, snow events
```

---

## Database

The app is wired to **Supabase** (Auth + Postgres). `db/schema.sql` documents the data model and
`db/migrations/` holds the grants and indexes the app needs. The old browser-database files in
`src/db/` are kept only for their shared `AppError` helpers; the live services talk to Supabase.

### Tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `users` | Accounts | `username` (unique, lower case), `displayName`, `bio`, `passwordHash`, `passwordSalt` |
| `sessions` | Logins | `userId`, `expiresAt` (30 days) |
| `prompts` | Starter prompts | `text`, `category` (`ask`, `confess`, `never`, `words`) |
| `confessions` | Anonymous messages | `recipientId`, `body`, `promptId`, `senderFingerprint`, `readAt`, `answer`, `answeredAt`, `isPublic` |
| `reactions` | Reactions on public answers | `confessionId`, `fingerprint`, `kind` (unique per visitor, confession, and kind) |

```
users 1 ──< sessions
users 1 ──< confessions >── 0..1 prompts
confessions 1 ──< reactions
```

### How it works

- Supabase Auth owns email/password accounts. A trigger on `auth.users` creates the matching row
  in `profiles` from the signup metadata (`username`, `display_name`).
- The browser keeps the Supabase session, and `src/hooks/auth.tsx` follows it across tabs.
- `src/services/confessions.ts` reads and writes `confessions` directly. Sending a confession and
  toggling a reaction go through `SECURITY DEFINER` RPCs so anonymous visitors never get table
  write access.
- Row Level Security limits owners to their own inbox rows; `db/migrations/` supplies the grants
  those policies rely on.
- Realtime keeps the inbox and unread badge fresh, and the SQL schema enforces length limits and
  "a public reply needs an answer".

---

## Animations

| Where | What |
| --- | --- |
| Whole app | Snow falling at a constant 2.5 degree angle, extra flurry when a confession is sent |
| Route changes | Fade and slide in and out (`AnimatePresence`) |
| Navbar | Slides down on load, slowly rotating snowflake logo, unread badge |
| Hero | Letter-by-letter spring title, staggered subtitle and buttons |
| Hero card | Entrance tilt, rotating sample confessions, floating bubbles, hover straighten |
| Marquee | Endless scroll, pauses on hover |
| Sections | Scroll-triggered reveals with staggered delays |
| Cards | Hover lift and tilt on game cards |
| Buttons | Lift on hover, press on click |
| Forms | Animated tab pill, expanding fields, shake on error |
| Inbox | Cards spring in and slide out when deleted, pulsing unread dot |
| Toasts | Spring in and out |
| Send success | Snowflake spins in, snow burst |

`MotionConfig reducedMotion="user"` and a `prefers-reduced-motion` CSS block calm the movement
for people who ask for it. The snow keeps falling, but at half speed.

---

## Development process

This is how the project was built, in order.

### 1. Research
- Looked at ngl.link to understand its structure: a bold hero, a ribbon of prompts, a "how it
  works" flow, a section for each way to play, a final call to action, and a minimal footer.
  Only the **structure** was used as a reference. All words, colors, and art are new.
- Applied the **UX copy** guidance: buttons start with a verb ("Create my link", "Delete
  confession"), errors say what happened and how to fix it, empty states say how to start, and
  destructive steps are named ("Delete confession" / "Keep it").

### 2. Foundation
- Created a Vite + React + TypeScript project with strict compiler options
  (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- Defined design tokens in `:root`. Sand `#D8CBB3` is the page color. Blue `#2F6BFF` is used for
  buttons, headers, and accents.
- **Contrast decision:** blue text on sand is only about 2.8:1, which is too low for reading. So
  blue is used as a *background* with white text (4.5:1), and body text uses a deep navy ink
  (`#0F1B3D`) on sand, which is far above 4.5:1.

### 3. Database
- Wrote row types first, then a generic `Table<T>`, then the `Database` class.
- Added a subscribe/version pair so React can read data with `useSyncExternalStore`.
- Wrote the matching `db/schema.sql`.
- Found and fixed a bug while designing login: the session id is saved *after* the session row
  is inserted, so the first change notification fired too early and the app stayed "logged out".
  `db.refresh()` now notifies again once the key is saved.

### 4. Services
- Passwords are hashed with PBKDF2-SHA256 (120,000 iterations) and a random salt per user.
- Login returns one generic message for "no such user" and "wrong password", and does the same
  amount of hashing work for both.
- Confessions are limited to 3 per minute per browser. Owners can only touch their own inbox.
  Reactions are only allowed on publicly answered confessions.

### 5. Interface
- Built shared pieces first (`Button`, `Reveal`, `PageTransition`, `Marquee`, `Toast`), then the
  pages: Landing, Auth, Send, Inbox, and NotFound.
- Wrote the snow canvas by hand: 45 to 150 flakes based on screen size, gentle sway, white flakes
  with a faint blue rim so they stay visible on sand, and smaller blue flakes for depth.

### 6. Verification
Every step below was run, not assumed:
1. `tsc --noEmit` and `vite build` pass with no errors.
2. `scripts/smoke.mts` runs 32 checks against the services. All pass.
3. A real Chrome run through the built app checked 22 things end to end: landing page and snow
   pixels, theme color, signup validation, redirects, sending, inbox, reply, public page,
   reactions, reload persistence, 404 pages, login errors, mobile layout, and zero console
   errors.
4. That run found one real bug, 21px of horizontal scroll on phones caused by the tilted marquee.
   It was fixed with `overflow-x: clip` on the app shell, which keeps the sticky navbar working.

---

## Security and privacy notes

- Senders are never shown to the recipient. The only sender data stored is a random per-browser
  id used for rate limiting and to stop duplicate reactions.
- Passwords are salted and hashed, never stored as typed.
- All text is rendered by React, which escapes it, so confessions cannot inject HTML.
- Redirect targets after login are checked so they can only point inside the app.

## Known limits of this build

- **Data lives in the browser.** A confession sent from your friend's phone will not reach your
  inbox on your laptop, because there is no server yet. To go live, add a backend (see
  [Moving to a real backend](#moving-to-a-real-backend)). The app was structured so that this
  swap touches only `src/services`.
- Client-side rate limiting and login checks can be bypassed by anyone who edits their own
  storage, so a real backend must enforce them again on the server.
- There is no password reset, email, or moderation tooling yet.
- Google Fonts (Fraunces and DM Sans) load from the network. Without it, the app falls back to
  Georgia and system fonts.
- The AnimatedWebs Design Studio skill needs a personal account connection that was not
  available in this session, so the animations were built directly with Framer Motion and CSS.

## Ideas for next steps

- A Node or Supabase backend using `db/schema.sql`
- Email or social sign-in and password reset
- Report and block tools for moderation
- Share-as-image cards for stories
- Dark "midnight" theme using the same two brand colors
