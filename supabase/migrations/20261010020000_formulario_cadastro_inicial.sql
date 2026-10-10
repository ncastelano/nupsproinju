-- Perguntas do formulário (editáveis pelo admin) e cadastros de acolhidos (respostas).

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = auth.uid() and status = 'approved');
$$;

create table public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_key text not null default 'cadastro_inicial',
  key text not null,                       -- identificador estável da pergunta
  position int not null default 0,
  section text not null default '',
  label text not null,
  help text not null default '',
  type text not null default 'text'
    check (type in ('text', 'textarea', 'date', 'select', 'radio', 'radio_other')),
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (form_key, key)
);

create table public.intake_records (
  id uuid primary key default gen_random_uuid(),
  form_key text not null default 'cadastro_inicial',
  created_by uuid not null references auth.users(id),
  -- { "<key>": { "label": "...", "value": "..." } }  (guarda o texto da pergunta da época)
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.form_questions enable row level security;
alter table public.intake_records enable row level security;

create policy "membros aprovados leem perguntas" on public.form_questions
  for select using (public.is_approved());

create policy "membro aprovado cria o proprio cadastro" on public.intake_records
  for insert with check (created_by = auth.uid() and public.is_approved());
create policy "ve os proprios cadastros ou todos se admin" on public.intake_records
  for select using (created_by = auth.uid() or public.is_admin());
-- Escrita nas perguntas: só pelo servidor (service role), depois de checar admin.

insert into public.form_questions (key, position, section, label, help, type, options, required) values
('profissional', 10, 'IDENTIFICAÇÃO', 'Profissional responsável pelo acompanhamento', '', 'select', '[
  "Camila Cordeiro de Lucena - CRP 24/00660",
  "Cassia Cristina de Oliveira Pereira - CRESS 1381/RO",
  "Cecilia Gondim Lima Medeiros - CRESS 1283/RO",
  "Danielle de Oliveira Paulon - CRP 24/00558",
  "Danielle Gonçalves Correia - CRP 24/1226",
  "Diana Gomes Barbosa - CRESS 2928/RO",
  "Gessiane Rodrigues de Sousa Santos - CRP 24/01858",
  "Josefina Rica Mourão - CRP 24/90",
  "Maria Socorro da Silva Bezerra - CRESS 230/RO",
  "Rita de Cassia Prestes Picanco - CRESS 0215/RO",
  "Simone Machado dos Santos Andrade - CRP 24/03829",
  "Tânia do Socorro Silva da Silva - CRP 24/00794",
  "Vinicius Matveiev Pessoa Santiago - CRP 24/04489"
]'::jsonb, true),
('processo', 20, 'IDENTIFICAÇÃO', 'Número do processo', '', 'text', '[]', true),
('nomes', 30, 'IDENTIFICAÇÃO', 'Nome completo da(s) criança(s)/adolescente(s)', 'Em caso de grupo de irmãos, separar os nomes por ponto e vírgula (;).', 'text', '[]', true),
('nascimentos', 40, 'IDENTIFICAÇÃO', 'Data de nascimento', 'Em caso de grupo de irmãos, registre as datas na mesma ordem em que os nomes foram informados acima, separando-as por ponto e vírgula (;).', 'text', '[]', true),
('genitora', 50, 'IDENTIFICAÇÃO', 'Nome da genitora', '', 'text', '[]', false),
('genitora_endereco', 60, 'IDENTIFICAÇÃO', 'Endereço da genitora', 'Informar endereço completo, quando conhecido.', 'text', '[]', false),
('genitora_contato', 70, 'IDENTIFICAÇÃO', 'Telefone/Contato da genitora', 'Informar telefone e/ou WhatsApp, quando disponível.', 'text', '[]', false),
('genitor', 80, 'IDENTIFICAÇÃO', 'Nome do genitor', '', 'text', '[]', false),
('genitor_endereco', 90, 'IDENTIFICAÇÃO', 'Endereço do genitor', 'Informar endereço completo, quando conhecido.', 'text', '[]', false),
('genitor_contato', 100, 'IDENTIFICAÇÃO', 'Telefone/Contato do genitor', 'Informar telefone e/ou WhatsApp, quando disponível.', 'text', '[]', false),
('data_acolhimento', 110, 'ACOLHIMENTO', 'Data do acolhimento', '', 'date', '[]', true),
('conselho_tutelar', 120, 'ACOLHIMENTO', 'Conselho Tutelar responsável pelo acolhimento/encaminhamento', 'Informar o Conselho Tutelar que realizou o acolhimento/encaminhamento da criança ou adolescente, quando identificado.', 'text', '[]', false),
('modalidade', 130, 'ACOLHIMENTO', 'Modalidade atual de acolhimento', '', 'radio_other',
  '["Acolhimento institucional", "Serviço de Acolhimento em Família Acolhedora"]'::jsonb, true),
('unidade', 140, 'ACOLHIMENTO', 'Unidade/serviço de acolhimento', '', 'text', '[]', true),
('outros_processos', 150, 'ACOLHIMENTO', 'Existem outros processos judiciais relacionados à criança/adolescente?', '', 'radio',
  '["Sim", "Não", "Não foi possível verificar"]'::jsonb, true),
('outros_processos_numeros', 160, 'ACOLHIMENTO', 'Se sim, informe o(s) número(s) do(s) processo(s) relacionado(s)', '', 'text', '[]', false),
('procedimentos', 170, 'AVALIAÇÃO INICIAL', 'Procedimentos realizados na avaliação inicial', 'Registrar a data, o procedimento realizado e a pessoa/instituição envolvida, utilizando uma linha para cada procedimento.', 'textarea', '[]', true);
