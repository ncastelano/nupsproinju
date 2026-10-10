-- Perfil (registro profissional e foto) e perguntas por pessoa. Tudo aditivo e idempotente.
alter table public.members add column if not exists registry text not null default '';
alter table public.members add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Cada pessoa ganha a própria cópia das perguntas ao editar (owner_id nulo = modelo).
alter table public.form_questions
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.form_questions'::regclass and contype = 'u'
  loop
    execute format('alter table public.form_questions drop constraint %I', c);
  end loop;
end $$;

create unique index if not exists form_questions_owner_key
  on public.form_questions (form_key, key, coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid));
