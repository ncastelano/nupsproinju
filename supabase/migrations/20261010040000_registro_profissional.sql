-- Registro profissional (CRP/CRESS) passa a ser informado por cada pessoa.
alter table public.members add column if not exists registry text not null default '';
alter table public.acolhimentos add column if not exists professional_name text not null default '';
alter table public.acolhimentos add column if not exists professional_registry text not null default '';

-- Quem já estava ligado a um profissional do NUPS herda o registro dele.
update public.members m set registry = p.registry
from public.professionals p
where m.professional_id = p.id and m.registry = '';
