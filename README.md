# Ricardo Neves Personal

Plataforma para alunos e personal trainer — **React, TypeScript, Vite, Tailwind, Supabase**.

> Seu treino. Sua evolução. Seu resultado.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + componentes estilo shadcn/ui
- React Router, TanStack Query, React Hook Form + Zod
- Supabase Auth / Postgres / Storage (RLS multi-tenant)
- PWA (cache apenas de estáticos públicos)
- Pronto para Vercel (`vercel.json`)

## Áreas

| Rota | Função |
|------|--------|
| `/` | Site público (preservado) + acessos |
| `/aluno` | App do aluno (mobile-first) |
| `/personal` | Painel administrativo |

## Executar

```bash
npm install
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

```bash
npm run test
npm run build
```

Sem credenciais Supabase o app abre o site e as rotas de área mostram o aviso de ambiente não conectado — não há “modo demo” fingindo persistência.

## Supabase

1. Aplique as migrations em `supabase/migrations/`.
2. Configure Auth URLs — veja [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).
3. Crie o primeiro admin — veja [docs/BOOTSTRAP_ADMIN.md](docs/BOOTSTRAP_ADMIN.md).

```bash
# Opcional, com service role local:
# SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ADMIN_EMAIL=... ADMIN_PASSWORD=...
node scripts/bootstrap-admin.mjs
```

## Publicação (Vercel)

- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Rewrites SPA já em `vercel.json`
- Variáveis: `VITE_APP_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Estrutura

```
src/
  features/     # auth, student, personal, billing
  layouts/      # aluno (bottom nav) e personal (sidebar)
  components/   # UI e brand
  lib/          # supabase, assessment, money, theme
  pages/        # landing e gates
supabase/migrations/
docs/
```

## Fases seguintes

Documentadas em `PLAN.md`: agenda, evolução/gráficos, PDF, gateway de pagamento, push, chat, assinatura da plataforma para outros profissionais.

## Testes

Cobrem IMC/composição, timer de descanso por deadline, sanitização de redirect e dinheiro (`npm test`).

## App Android (APK)

O APK é uma "casca" (Capacitor) que abre `https://personalricardoneves.com.br`.
**Todo deploy na Vercel já aparece no app** — não precisa gerar APK de novo.
Dentro do app a home institucional é trocada por uma tela "Sou aluno / Sou personal"
(detectado pelo user agent `RNPersonalApp`, ver `src/lib/native/isNativeApp.ts`).

Só gere um APK novo se mudar ícone, nome, URL ou `capacitor.config.ts`
(aumente `versionCode` em `android/app/build.gradle`):

```bash
npx cap sync android
cd android && ./gradlew assembleRelease   # requer JDK 17/21 em JAVA_HOME
# saída: android/app/build/outputs/apk/release/app-release.apk
```

A chave de assinatura (`android/app/rn-personal-release.jks` + `android/keystore.properties`)
não vai para o git. **Guarde um backup** — sem ela não dá para atualizar o app já instalado.
