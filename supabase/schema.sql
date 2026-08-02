-- Kubo waitlist: tabela de inscrições
-- Corre este script no Supabase Dashboard > SQL Editor (projeto peqmbseikyktapqcqldb)

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  corridor text not null check (corridor in ('AO', 'CV', 'GW', 'ST', 'MZ')),
  created_at timestamptz not null default now()
);

-- RLS: só permite INSERT anónimo (sem leitura, sem update, sem delete via client)
alter table public.waitlist_signups enable row level security;

create policy "Public can join waitlist"
  on public.waitlist_signups
  for insert
  to anon
  with check (true);
