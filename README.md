# 🎯 MP Mess Darts League

A premium, mobile-optimised, real-time darts league web application.

**Tech Stack:** Next.js 14 (App Router) · Tailwind CSS · Supabase (Database + Auth)  
**Theme:** Irish Sports — Charcoal · Emerald Green · Amber Gold

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/mp-mess-darts-league.git
cd mp-mess-darts-league
npm install
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste + run the contents of `schema.sql`
3. Go to **Authentication → Users** and create an admin user (email + password)
4. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout & metadata
│   ├── page.tsx            # Public home: standings + fixtures
│   ├── login/page.tsx      # Admin login
│   └── admin/page.tsx      # Protected admin dashboard
├── components/
│   ├── LeagueTable.tsx     # Standings grid
│   ├── PublicFixtures.tsx  # Weekly fixtures tabs
│   └── AdminDashboard.tsx  # Score entry + roster management
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── utils.ts            # Standings calculation engine
└── types/
    └── index.ts            # TypeScript interfaces
schema.sql                  # Run this in Supabase SQL Editor
```

---

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Import into [Vercel](https://vercel.com)
3. Add your environment variables in the Vercel dashboard
4. Deploy — done!

---

## 📋 Scoring Rules

| Result | Points |
|--------|--------|
| Win    | 2 pts  |
| Loss   | 0 pts  |

**Tiebreaker order:**
1. Points
2. Head-to-head record
3. Leg difference (+/-)

---

## 🔐 Admin Access

- Visit `/login` and sign in with the Supabase auth user you created
- From the admin dashboard you can:
  - Add / manage players
  - Create league weeks / stages
  - Schedule fixtures
  - Enter and edit match scores

---

## 📦 Required Additional Package

The admin auth guard uses `@supabase/auth-helpers-nextjs`. Install it:

```bash
npm install @supabase/auth-helpers-nextjs
```

Then update `package.json` accordingly before committing.
