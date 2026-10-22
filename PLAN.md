# PLAN — Ricardo Neves Personal (MVP)

## Status

- [x] Análise do projeto existente (site institucional preservado em `/`)
- [x] Fundação: TypeScript, Vite, Tailwind v4, deps, shadcn-style UI
- [x] Migrations Supabase + RLS + Storage + RPCs de convite/aprovação
- [x] Auth e rotas `/`, `/aluno`, `/personal`
- [x] Cadastro de alunos + anamnese + avaliação básica
- [x] Exercícios + montagem/publicação + execução de treinos
- [x] Financeiro manual + dashboard
- [x] PWA, Vercel, README, testes, build

## Verificado

- `npm run typecheck` — ok
- `npm test` — 6 testes (IMC, composição, rest timer, redirect, money)
- `npm run build` — ok

## Pendente externo (credenciais)

1. Projeto Supabase + aplicar `supabase/migrations/*.sql`
2. `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. Auth redirect URLs (ver `docs/SUPABASE_SETUP.md`)
4. Bootstrap do 1º admin (`docs/BOOTSTRAP_ADMIN.md`)
5. Deploy Vercel + `VITE_APP_URL` de produção
6. ~~Substituir ícones PWA placeholder~~ — feito (gerados a partir do logo)

## Próximas fases

Ver `docs/PHASES.md`.
