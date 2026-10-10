-- Cadastro aberto com aprovação do administrador.
-- A primeira pessoa a se cadastrar vira administradora já aprovada; as demais entram "pending".
-- (Substitui a tabela anterior, que ainda estava vazia.)
drop table if exists public.members cascade;

create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

create policy "ver o proprio cadastro ou todos se admin" on public.members
  for select using (id = auth.uid() or public.is_admin());
-- Escrita só pelo servidor (service role), depois de checar que quem pede é admin.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.members) into first_user;
  insert into public.members (id, email, name, role, status)
  values (
    new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'name', ''),
    case when first_user then 'admin' else 'member' end,
    case when first_user then 'approved' else 'pending' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
