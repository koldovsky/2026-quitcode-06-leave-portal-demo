# Бутстрап форку — докази

<!--
Заповнює розробник. Для кожного пункту — доказ: посилання (PR, run CI, preview), назва змінної або
знімок екрана в docs/img/. ЗНАЧЕННЯ СЕКРЕТІВ НІКОЛИ НЕ ПИШІТЬ — лише назви змінних і де вони задані.
Покрокові команди — у README.md, розділ «Шлях розробника».
-->

Upstream PM: <!-- owner/team-repo --> · Мій форк: <!-- me/team-repo --> · Версія спеки: <!-- spec-v0.1 -->

## GitHub

- [ ] Форк створено, Actions увімкнено (Actions → «I understand my workflows, go ahead and enable them») — <!-- посилання на перший run -->
- [ ] `gh repo set-default <я>/<форк>` виконано (PR іде у форк, а не в upstream) — <!-- вивід `gh repo set-default --view` -->
- [ ] Ruleset на `main`: PR обов'язковий, статуси `spec` і `app` обов'язкові — <!-- знімок налаштувань -->
- [ ] Тег спеки злито гілкою `sync/spec-v0.1`, `.spec-source` заповнено (`upstream:`, `version:`), `npm run spec:source` → OK
- [ ] CodeRabbit встановлено на свій акаунт; у PR працює `@coderabbitai review`

## Supabase

- [ ] Проєкт створено у власній організації Supabase (не через Vercel Marketplace) — <!-- регіон -->
- [ ] «Confirm email» вимкнено (Authentication → Sign In / Providers → Email; https://supabase.com/dashboard/project/_/auth/providers)
- [ ] `npx supabase login` · `npx supabase link --project-ref <ref>` — <!-- вивід без секретів -->
- [ ] `npx supabase db push --dry-run` → `npm run db:push` — <!-- список застосованих міграцій -->
- [ ] `npm run db:types` — `src/lib/supabase/database.types.ts` перегенеровано
- [ ] `npm run users:demo` — синтетичні користувачі створені, вхід як `admin@example.test` працює
- [ ] Auth → URL Configuration: Site URL = прод-URL Vercel; Redirect URLs: `http://localhost:3000/**`, `https://*-<slug>.vercel.app/**`
- [ ] Секрети CI (Settings → Secrets → Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` — лише назви

## Vercel

- [ ] Проєкт імпортовано з форку (Hobby), Node 24.x — <!-- прод-URL -->
- [ ] Змінні в Production і Preview: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (тип Secret) — лише назви
- [ ] Після зміни змінних — редеплой
- [ ] Vercel Authentication для preview вимкнено (PM відкриває preview без входу)

## Перший PR

- [ ] PR у форку: CI зелений (`spec`, `app`, `conformance`), preview відкривається — <!-- посилання -->
- [ ] Після merge у `main` job `db` виконав `supabase db push` — <!-- посилання на run -->
