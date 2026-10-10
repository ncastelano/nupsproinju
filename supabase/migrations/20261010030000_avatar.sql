-- Foto de perfil: coluna + bucket público "avatars" (upload feito pelo servidor).
alter table public.members add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
