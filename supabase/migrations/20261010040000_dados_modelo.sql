-- DADOS DE EXEMPLO (fictícios) para visualizar o sistema: 1 cadastro inicial + 1 acompanhamento.
-- Para apagar depois: delete from public.intake_records where answers->'nomes'->>'value' like 'MODELO - %';
with adm as (
  select id from public.members where role = 'admin' and status = 'approved' order by created_at limit 1
), cad as (
  insert into public.intake_records (form_key, created_by, answers)
  select 'cadastro_inicial', adm.id,
    (select jsonb_object_agg(q.key, jsonb_build_object('label', q.label, 'value', v.val))
       from (values
    ('profissional', 'Gessiane Rodrigues de Sousa Santos - CRP 24/01858'),
    ('processo', '0000000-00.2026.8.22.0001'),
    ('nomes', 'MODELO - Maria Exemplo; MODELO - João Exemplo'),
    ('nascimentos', '10/03/2015; 22/08/2018'),
    ('genitora', 'Genitora Modelo'),
    ('genitora_endereco', 'Rua Exemplo, 123 - Bairro Modelo, Porto Velho/RO'),
    ('genitora_contato', '(69) 90000-0000'),
    ('genitor', 'Genitor Modelo'),
    ('data_acolhimento', '2026-03-15'),
    ('conselho_tutelar', 'Conselho Tutelar Zona Sul'),
    ('modalidade', 'Acolhimento institucional'),
    ('unidade', 'Casa de Acolhimento Modelo'),
    ('outros_processos', 'Não'),
    ('procedimentos', '16/03/2026 - Entrevista inicial com a equipe técnica da unidade
20/03/2026 - Visita institucional e escuta das crianças
25/03/2026 - Contato com a genitora (telefone)')
       ) as v(key, val)
       join public.form_questions q on q.form_key = 'cadastro_inicial' and q.key = v.key)
  from adm
  returning id, created_by, answers
)
insert into public.intake_records (form_key, created_by, answers, parent_id)
select 'acompanhamento', cad.created_by,
  (select jsonb_object_agg(q.key, jsonb_build_object('label', q.label, 'value', v.val))
     from (values
    ('acomp_1', 'Gessiane Rodrigues de Sousa Santos - CRP 24/01858'),
    ('acomp_2', '2026-09-20'),
    ('acomp_3', '05/08/2026 - Visita à unidade de acolhimento
18/08/2026 - Reunião de rede com escola e UBS
02/09/2026 - Atendimento à genitora'),
    ('acomp_4', 'Houve alteração/evolução relevante'),
    ('acomp_5', 'Boa adaptação à rotina da unidade; passaram a participar das atividades coletivas.'),
    ('acomp_6', 'Permanece sem alterações relevantes'),
    ('acomp_7', 'Frequência escolar regular; sem intercorrências.'),
    ('acomp_8', 'Houve alteração/evolução relevante'),
    ('acomp_9', 'Consultas de rotina realizadas; vacinação atualizada.'),
    ('acomp_10', 'Permanece sem alterações relevantes'),
    ('acomp_12', 'Houve alteração/evolução relevante'),
    ('acomp_13', 'Visitas quinzenais da genitora, com boa receptividade das crianças.'),
    ('acomp_14', 'Não se aplica'),
    ('acomp_16', 'Há possibilidade de reintegração, condicionada à evolução de aspectos ainda em acompanhamento'),
    ('acomp_17', 'Não localizado/sem informações atualizadas'),
    ('acomp_18', 'Busca por família extensa em andamento'),
    ('acomp_20', 'Genitora aderiu ao acompanhamento no CRAS; permanece pendente a comprovação de moradia.'),
    ('acomp_21', 'Manutenção do acolhimento para continuidade das intervenções'),
    ('acomp_23', 'Verificar comprovação de moradia e a evolução das visitas; novo contato com a rede de saúde.')
     ) as v(key, val)
     join public.form_questions q on q.form_key = 'acompanhamento' and q.key = v.key)
  || jsonb_build_object('processo', jsonb_build_object('label', 'Número do processo', 'value', cad.answers->'processo'->>'value')),
  cad.id
from cad;
