# Núcleo Psicossocial — Vara de Proteção à Infância e Juventude de Porto Velho

Site (PWA) do Núcleo Psicossocial. Domínio: nupsproinjur.com. Stack: Next.js (App Router) + TypeScript + Supabase + Vercel + Google Docs/Planilhas.

## Regras que não podem quebrar
- **Repositório público, dados sensíveis (crianças/adolescentes).** Nunca commitar chave, token, `.env`, nome ou dado de pessoa real, nem documento. Segredos só no Vercel/Supabase.
- **RLS em toda tabela**, sempre (`supabase/migrations`). Nenhuma tabela nova sem policy.
- Roteamento: `src/proxy.ts` (Next 16) exige login em tudo, exceto `PUBLIC_PATHS`. Página pública nova → adicionar lá.
- `SUPABASE_SERVICE_ROLE_KEY` só em código de servidor (`createServiceClient`), nunca em componente client.
- Service worker (`public/sw.js`) NÃO faz cache de dados — conteúdo sensível.
- Documentos: visibilidade `todos` (qualquer usuário ativo) ou `privado` (dono + `documento_compartilhamentos` + admin).
