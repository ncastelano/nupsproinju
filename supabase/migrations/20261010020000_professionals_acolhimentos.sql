-- Profissionais do NUPS (cadastro prévio) + formulários de acolhimento.

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  registry text not null default '',
  created_at timestamptz not null default now()
);
alter table public.professionals enable row level security;
drop policy if exists "profissionais visiveis a logados" on public.professionals;
create policy "profissionais visiveis a logados" on public.professionals
  for select to authenticated using (true);

insert into public.professionals (name, registry) values
  ('Camila Cordeiro de Lucena', 'CRP 24/00660'),
  ('Cassia Cristina de Oliveira Pereira', 'CRESS 1381/RO'),
  ('Cecilia Gondim Lima Medeiros', 'CRESS 1283/RO'),
  ('Danielle de Oliveira Paulon', 'CRP 24/00558'),
  ('Danielle Gonçalves Correia', 'CRP 24/1226'),
  ('Diana Gomes Barbosa', 'CRESS 2928/RO'),
  ('Gessiane Rodrigues de Sousa Santos', 'CRP 24/01858'),
  ('Josefina Rica Mourão', 'CRP 24/90'),
  ('Maria Socorro da Silva Bezerra', 'CRESS 230/RO'),
  ('Rita de Cassia Prestes Picanco', 'CRESS 0215/RO'),
  ('Simone Machado dos Santos Andrade', 'CRP 24/03829'),
  ('Tânia do Socorro Silva da Silva', 'CRP 24/00794'),
  ('Vinicius Matveiev Pessoa Santiago', 'CRP 24/04489')
on conflict (name) do nothing;

-- Cada conta pode estar ligada a um profissional do NUPS (e cada profissional a uma conta).
alter table public.members
  add column if not exists professional_id uuid unique references public.professionals(id) on delete set null;

create table if not exists public.acolhimentos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  process_number text not null,
  children_names text not null,
  children_birthdates text not null,
  mother_name text not null default '',
  mother_address text not null default '',
  mother_contact text not null default '',
  father_name text not null default '',
  father_address text not null default '',
  father_contact text not null default '',
  reception_date date not null,
  tutelary_council text not null default '',
  modality text not null,
  unit_name text not null,
  has_related_processes text not null check (has_related_processes in ('sim', 'nao', 'nao_verificado')),
  related_processes text not null default '',
  procedures text not null,
  created_at timestamptz not null default now()
);
alter table public.acolhimentos enable row level security;

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = auth.uid() and status = 'approved');
$$;

drop policy if exists "ver proprios ou todos se admin" on public.acolhimentos;
create policy "ver proprios ou todos se admin" on public.acolhimentos
  for select using (created_by = auth.uid() or public.is_admin());
drop policy if exists "criar proprios" on public.acolhimentos;
create policy "criar proprios" on public.acolhimentos
  for insert with check (created_by = auth.uid() and public.is_approved());
drop policy if exists "apagar proprios" on public.acolhimentos;
create policy "apagar proprios" on public.acolhimentos
  for delete using (created_by = auth.uid() or public.is_admin());
