# Solicitação de liberação de acesso — PROINJU (NUPS / Vara de Proteção à Infância e Juventude de Porto Velho)

> Preencha os trechos entre [colchetes] antes de enviar. Itens marcados com (conferir) dependem de informação do provedor ou da chefia.

## 1. Texto para o chamado no AtendeMais

**Assunto:** Solicitação de liberação (homologação) de acesso ao sistema PROINJU — nupsproinjur.vercel.app

Prezados,

Solicito a liberação do endereço **https://nupsproinjur.vercel.app** na rede do PJRO. O acesso está sendo bloqueado pela política de segurança (categoria "web-hosting", Resolução nº 350/2025), com origem no IP **10.202.8.110** (print anexo).

**O que é:** o PROINJU é uma ferramenta de apoio ao trabalho do Núcleo Psicossocial (NUPS) da Vara de Proteção à Infância e Juventude de Porto Velho/RO. Ela organiza o Cadastro inicial, os Acompanhamentos/reavaliações e as Fiscalizações de unidades de acolhimento, gerando os relatórios no padrão do núcleo (.docx/PDF) para revisão e edição pelos profissionais.

**Quem usa:** somente os profissionais do núcleo ([quantidade] pessoas), com conta nominal aprovada por um administrador. Responsável: [nome, cargo, matrícula/telefone]. Ciência da chefia: [nome / sim, anexo].

**Por que é seguro:** segue anexa a ficha técnica de segurança (item 2). Em resumo: acesso somente com login individual aprovado, conexão criptografada (HTTPS), dados em banco e armazenamento privados, registro de quem criou e alterou cada relatório e nenhum dado exposto publicamente.

**O que precisa ser liberado:**
- `nupsproinjur.vercel.app` (porta 443/HTTPS) — a aplicação.
- Opcional, para a função de transcrição de áudio no navegador: `cdn.jsdelivr.net` e `huggingface.co` (download do modelo de transcrição; sem envio de áudio).

Fico à disposição para qualquer esclarecimento técnico ou para uma demonstração.

Atenciosamente,
[Nome] — [Cargo/Setor] — [Ramal/e-mail]

---

## 2. Ficha técnica de segurança (anexar ao chamado)

| Tema | Como o sistema trata |
|---|---|
| **Finalidade** | Apoio à elaboração de relatórios técnicos do NUPS. Uso institucional, sem fim comercial, sem publicidade. |
| **Quem acessa** | Apenas profissionais com conta nominal. Cada solicitação de acesso fica pendente até um administrador aprovar; contas pendentes ou recusadas não veem nenhum dado. |
| **Autenticação** | E-mail e senha individuais (serviço de autenticação gerenciado). A senha não é visível nem para os administradores. |
| **Quem pode editar** | Qualquer profissional aprovado visualiza; só edita quem criou o relatório ou foi adicionado por ele. O administrador visualiza e gerencia permissões. |
| **Rastreabilidade** | Cada relatório guarda histórico de quem criou, editou, adicionou editores ou gravou áudio, com data e hora. |
| **Transporte** | Todo o tráfego usa HTTPS (TLS). |
| **Armazenamento** | Banco PostgreSQL gerenciado com controle de acesso por linha; relatórios (.docx) e áudios em armazenamento **privado** (sem link público). |
| **Dados públicos** | Nenhum dado de criança/adolescente é público. O perfil público mostra apenas nome e registro profissional, e notas que a própria pessoa marcar como públicas. |
| **Áudio e transcrição** | A gravação é feita no navegador e a transcrição também roda no navegador do usuário; o áudio não é enviado a serviço de transcrição de terceiros. |
| **Provedores** | Aplicação: Vercel. Banco e arquivos: Supabase. Ambos publicam certificações de segurança (SOC 2 Tipo II) em documentação pública (conferir os relatórios atualizados). Região dos dados: [conferir no painel do Supabase]. |
| **Cópia e eliminação** | Relatórios podem ser baixados (.docx/PDF) e apagados pelo autor ou administrador. [Definir com a chefia a política de retenção.] |
| **LGPD** | Dados tratados para execução de atribuição legal do órgão (art. 7º, III e art. 23). Dados de crianças e adolescentes tratados em seu melhor interesse (art. 14). Encarregado/DPO do TJRO: [conferir contato]. |

## 3. Se a liberação do endereço atual não for possível

- Hospedar em **domínio próprio** (ex.: `nupsproinjur.com.br`) ligado à mesma aplicação; domínio próprio costuma ser avaliado pelo conteúdo e não cair na categoria "web-hosting" (não é garantido).
- Solicitar ao TI o **hospedamento em infraestrutura do TJRO**, caso a política exija dados dentro do tribunal.

## 4. Próximos passos sugeridos
1. Enviar o chamado com o print do bloqueio e esta ficha.
2. Informar o nome do responsável técnico e da chefia que autoriza.
3. Oferecer uma demonstração com dados fictícios (o sistema já tem processos de exemplo "MODELO").
