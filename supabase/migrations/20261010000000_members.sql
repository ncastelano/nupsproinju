-- Lista de pessoas permitidas. Só entra quem tem linha aqui (cadastro aberto fica desligado
-- no painel do Supabase: Authentication > Providers > Email > desmarcar "Allow new users to sign up").
create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = auth.uid() and role = 'admin' and active);
$$;

create policy "ver o próprio cadastro ou todos se admin" on public.members
  for select using (id = auth.uid() or public.is_admin());
-- Escrita só pelo servidor (service role), depois de checar que quem pede é admin.
