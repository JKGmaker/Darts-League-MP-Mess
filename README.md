# MABB Registration 2026/27

Online club registration for the Midland Area Basketball Board. Clubs sign in with
credentials you issue, enter players per age group and team (with playing-up
sections), and fees calculate live. You control everything from the admin dashboard.

## Features

- **Club logins** - you create each club's email + password from the admin panel
- **Admin dashboard** - every club's player counts, teams, fees due, last activity, league total, CSV export of all entries
- **Registration deadlines** - separate juvenile and senior cutoffs, set from the dashboard:
  - After the juvenile deadline, juvenile rosters become read-only for clubs
  - After the senior deadline, senior rosters become read-only
  - After BOTH deadlines, clubs can no longer sign in at all
  - Locks are enforced by database row-level security, not just the browser, so they cannot be bypassed
- **Autosave** - every entry saves as the club types
- Fee rules mirror the registration spreadsheet: 12 EUR juvenile / 2 EUR playing up,
  20 EUR senior / 15 EUR playing up, 35/75 EUR team fees, 20 EUR coaches,
  affiliation and cup fees applied automatically

## Setup (once, ~20 minutes)

### 1. Supabase
1. Create a free project at supabase.com
2. SQL Editor -> New query -> paste the whole of `supabase/schema.sql` -> Run
3. Authentication -> Users -> Add user: your own admin email + password (tick auto-confirm)
4. Copy that user's UUID from the users list, then run in SQL Editor:
   `insert into profiles (id, role, club_name) values ('YOUR-UUID', 'admin', 'MABB Admin');`
5. Project Settings -> API: copy the Project URL, anon key, and service_role key

### 2. Local run (optional)
```
npm install
cp .env.example .env.local   # paste in your three Supabase values
npm run dev                  # http://localhost:3000
```

### 3. Netlify
1. Push this folder to a GitHub repo
2. Netlify -> Add new site -> Import from GitHub -> pick the repo
3. Site settings -> Environment variables: add the three values from `.env.example`
4. Deploy. Sign in with your admin account and add your first club.

## Running costs

Netlify free tier + Supabase free tier = 0 EUR/month for this usage. Optional
custom domain ~10-15 EUR/year. Note: free Supabase projects pause after 7 days
of inactivity - restore takes one click in their dashboard, or keep it awake
with a scheduled ping during registration season.

## Notes

- Coach entries stay open until the LATER of the two deadlines, then lock.
- To change a roster after a deadline, either move the deadline forward
  temporarily in the dashboard, or edit directly in Supabase (admin RLS allows it).
- Passwords: minimum 8 characters when creating clubs. To reset a club's
  password, use Supabase Dashboard -> Authentication -> Users -> reset.
