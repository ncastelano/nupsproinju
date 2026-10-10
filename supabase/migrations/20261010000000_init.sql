-- Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho
-- Base: usuários (acesso), documentos (Google Docs) com visibilidade, formulários.
-- Dados sensíveis (infância e juventude): RLS ligado em TUDO, nada público.

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cargo text,
  papel text not null default 'membro' check (papel in ('admin','membro')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  formato text,                       -- ex: 'laudo', 'parecer', 'relatorio'
  google_doc_id text,                 -- id do arquivo no Google Docs
  visibilidade text not null default 'privado' check (visibilidade in ('todos','privado')),
  criado_por uuid not null references public.perfis(id),
  criado_em timestamptz not null default now()
);

-- Quem, além do dono, enxerga um documento privado.
create table public.documento_compartilhamentos (
  documento_id uuid references public.documentos(id) on delete cascade,
  usuario_id uuid references public.perfis(id) on delete cascade,
  primary key (documento_id, usuario_id)
);

-- Modelos de formulário (perguntas em jsonb; serão carregadas depois).
create table public.formularios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  perguntas jsonb not null default '[]',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'admin' and ativo);
$$;

create or replace function public.is_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and ativo);
$$;

alter table public.perfis enable row level security;
alter table public.documentos enable row level security;
alter table public.documento_compartilhamentos enable row level security;
alter table public.formularios enable row level security;

-- perfis: ativos veem a lista (precisam escolher com quem compartilhar); só admin altera.
create policy perfis_select on public.perfis for select using (public.is_ativo());
create policy perfis_admin on public.perfis for all using (public.is_admin()) with check (public.is_admin());

-- documentos: 'todos' = qualquer usuário ativo; 'privado' = dono, compartilhados e admin.
create policy documentos_select on public.documentos for select using (
  public.is_ativo() and (
    visibilidade = 'todos'
    or criado_por = auth.uid()
    or public.is_admin()
    or exists (select 1 from documento_compartilhamentos c
               where c.documento_id = documentos.id and c.usuario_id = auth.uid())
  )
);
create policy documentos_insert on public.documentos for insert
  with check (public.is_ativo() and criado_por = auth.uid());
create policy documentos_update on public.documentos for update
  using (criado_por = auth.uid() or public.is_admin())
  with check (criado_por = auth.uid() or public.is_admin());
create policy documentos_delete on public.documentos for delete
  using (criado_por = auth.uid() or public.is_admin());

create policy compart_select on public.documento_compartilhamentos for select using (
  usuario_id = auth.uid() or public.is_admin()
  or exists (select 1 from documentos d where d.id = documento_id and d.criado_por = auth.uid())
);
create policy compart_write on public.documento_compartilhamentos for all
  using (public.is_admin() or exists (select 1 from documentos d where d.id = documento_id and d.criado_por = auth.uid()))
  with check (public.is_admin() or exists (select 1 from documentos d where d.id = documento_id and d.criado_por = auth.uid()));

create policy formularios_select on public.formularios for select using (public.is_ativo());
create policy formularios_admin on public.formularios for all using (public.is_admin()) with check (public.is_admin());
