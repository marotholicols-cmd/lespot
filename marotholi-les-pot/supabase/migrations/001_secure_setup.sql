-- MAROTHOLI LES-POT | Les-Pot GrindPay | 6399 WEB PORTAL
-- 1Ğ = M10 / R10 | Split: 63% Artist / 23% Platform / 14% Fees | Min withdraw 2.5Ğ

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text unique not null,
  country text check (country in ('LS','ZA')) default 'LS',
  gender text check (gender in ('Male','Female','Other')),
  email text unique not null,
  security_question text not null,
  security_answer_hash text not null,
  grind_balance numeric(12,2) default 0,
  is_owner boolean default false,
  is_blocked boolean default false,
  blocked_until timestamptz,
  blocked_reason text,
  admin_attempts int default 0,
  created_at timestamptz default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.profiles(id) not null,
  artist_name text not null,
  title text not null,
  price_grind numeric(10,2) not null check (price_grind > 0),
  price_maloti numeric(10,2) generated always as (price_grind * 10) stored,
  cover_url text,
  audio_path text not null,
  preview_start int default 0,
  total_buys int default 0,
  created_at timestamptz default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid references public.profiles(id) not null,
  song_id uuid references public.songs(id) not null,
  price_grind numeric(10,2) not null,
  royalty_grind numeric(10,2) generated always as (price_grind * 0.63) stored,
  platform_grind numeric(10,2) generated always as (price_grind * 0.23) stored,
  fees_grind numeric(10,2) generated always as (price_grind * 0.14) stored,
  pay_method text check (pay_method in ('Mpesa','EcoCash','Visa','Bank','Payfast')),
  pay_reference text not null,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.profiles(id) not null,
  amount_grind numeric(10,2) not null check (amount_grind >= 2.5),
  receive_method text not null,
  receive_details text not null,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_phone text,
  action text not null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.purchases enable row level security;
alter table public.withdrawals enable row level security;
alter table public.admin_logs enable row level security;

create policy "own_profile" on public.profiles for all using (auth.uid() = id);
create policy "public_songs" on public.songs for select using (true);
create policy "own_purchases" on public.purchases for all using (auth.uid() = fan_id);
create policy "own_withdrawals" on public.withdrawals for all using (auth.uid() = artist_id);

insert into storage.buckets (id, name, public) values ('covers','covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('songs','songs', false) on conflict (id) do nothing;