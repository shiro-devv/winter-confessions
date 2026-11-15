# Security Policy

## Reporting a vulnerability

If you find a security or privacy problem in Winter Confessions, please report it privately.
Do not open a public issue for something that could be abused.

- **Email:** shiro.does.dev@gmail.com
- **Subject:** `Security report: Winter Confessions`

Please include:

- what the problem is and where it happens (a URL or a file),
- the steps to reproduce it,
- what an attacker could do with it, and
- any proof-of-concept you can share safely.

## What to expect

This is a small personal project, so responses are best-effort, but reports are welcome and will
be looked at. Please give a reasonable amount of time to fix the issue before telling anyone else.

## Scope

In scope:

- The deployed site at `https://shiro-devv.github.io/winter-confessions/`
- The application code in this repository
- Authentication, session handling, and access control
- Anything that could leak confessions, account data, or the anonymous sender id

Out of scope:

- Denial-of-service and brute-force testing
- Reports that only show missing "best practice" HTTP headers on GitHub Pages (the platform does
  not allow custom response headers; the app ships a Content Security Policy as a meta tag instead)
- Social engineering, physical attacks, or spam

## What we do

- Passwords are salted and hashed by Supabase Auth; we never see them.
- All text is rendered by React, which escapes it, so confessions cannot inject HTML.
- Row Level Security limits database access to each owner's own rows.
- Sending a confession and toggling a reaction go through server-side functions, so anonymous
  visitors never get write access to tables.
- The site ships a Content Security Policy, a strict referrer policy, and this policy file.
