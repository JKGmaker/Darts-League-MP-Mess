-- ============================================================
-- MABB Registration — ADD-ON: MABB Account (bank balance)
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- (Safe to run on your existing project - it only adds things.)
-- ============================================================

-- Single row holding the treasurer-set starting balance
create table public.mabb_account_settings (
  id int primary key default 1 check (id = 1),
  starting_balance numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.mabb_account_settings (id) values (1);

create table public.mabb_account_transactions (
  id uuid primary key default gen_random_uuid(),
  txn_date date not null default current_date,
  description text not null,
  type text not null check (type in ('in', 'out')),
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index mabb_account_transactions_date_idx on public.mabb_account_transactions (txn_date, created_at);

alter table public.mabb_account_settings enable row level security;
alter table public.mabb_account_transactions enable row level security;

-- Any signed-in user (any admin or any club) can view the balance.
-- Only admins (the treasurer included, since any admin login can manage it) can change it.
create policy mabb_account_settings_read on public.mabb_account_settings for select
  using (auth.uid() is not null);
create policy mabb_account_settings_admin on public.mabb_account_settings for update
  using (is_admin()) with check (is_admin());

create policy mabb_account_txn_read on public.mabb_account_transactions for select
  using (auth.uid() is not null);
create policy mabb_account_txn_admin on public.mabb_account_transactions for all
  using (is_admin()) with check (is_admin());
