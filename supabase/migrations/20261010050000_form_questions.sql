-- Perguntas extras do formulário de acolhimento, criadas pelo administrador.
create table if not exists public.form_questions (
  id uuid primary key default gen_random_uuid(),
  position int not null default 0,
  label text not null,
  help text not null default '',
  kind text not null check (kind in ('text', 'textarea', 'date', 'choice', 'choice_other')),
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.form_questions enable row level security;
drop policy if exists "perguntas visiveis a logados" on public.form_questions;
create policy "perguntas visiveis a logados" on public.form_questions
  for select to authenticated using (true);
-- Escrita só pelo servidor (service role), depois de checar que quem pede é admin.

-- Respostas das perguntas extras (guarda o texto da pergunta junto, pra não mudar se ela for editada).
alter table public.acolhimentos add column if not exists extra_answers jsonb not null default '[]'::jsonb;
