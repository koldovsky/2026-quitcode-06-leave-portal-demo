# Бутстрап форку — докази

<!--
Заповнює розробник. Для кожного пункту — доказ: посилання (PR, run CI, preview), назва змінної або
знімок екрана в docs/img/ (перед комітом обріжте все зайве: на знімку не має бути назв клієнтів, імен і
значень — зображення spec:check не перевіряє). ЗНАЧЕННЯ СЕКРЕТІВ НІКОЛИ НЕ ПИШІТЬ — лише назви змінних і де вони задані.
Покрокові команди — у README.md, розділ «Шлях розробника».
-->

Upstream PM: <!-- owner/team-repo --> · Мій форк: <!-- me/team-repo --> · Версія спеки: <!-- spec-v0.1 -->

## GitHub

- [ ] Форк створено, Actions увімкнено (Actions → «I understand my workflows, go ahead and enable them») — <!-- посилання на перший run -->
- [ ] `gh repo set-default <я>/<форк>` виконано (PR іде у форк, а не в upstream) — <!-- вивід `gh repo set-default --view` -->
- [ ] Ruleset на `main`: PR обов'язковий, статуси `spec`, `app` і `conformance` обов'язкові — <!-- знімок налаштувань -->
- [ ] Окремим PR, коли PM поставив тег (форк після тегу — разом із цим файлом, див. «Перший PR»): `spec-v0.1` злито гілкою `sync/spec-v0.1` (merge commit), `.spec-source` заповнено (`upstream:`, `version:`), `npm run spec:source` → OK
- [ ] CodeRabbit встановлено на свій акаунт; у PR працює `@coderabbitai review`

## Supabase

- [ ] Проєкт створено у власній організації Supabase (не через Vercel Marketplace) — <!-- регіон -->
- [ ] «Confirm email» вимкнено (налаштування Authentication → провайдер Email; точне місце в Dashboard звіряємо на репетиції)
- [ ] «Allow new users to sign up» вимкнено (налаштування Authentication; точне місце звіряємо на репетиції): публічний ключ є в бандлі, тож інакше будь-хто зареєструється через Auth API; локально — `[auth] enable_signup = false` у `supabase/config.toml`; користувачів створює лише `npm run users:demo` (Admin API): з вимкненою реєстрацією він працює й у хмарі (за кодом GoTrue — так; звіряємо на репетиції)
- [ ] `npx supabase login` · `npx supabase link --project-ref <ref>` — <!-- вивід без секретів -->
- [ ] `npx supabase db push --dry-run` → `npm run db:push` — <!-- список застосованих міграцій -->
- [ ] `npm run db:types` — `src/lib/supabase/database.types.ts` перегенеровано
- [ ] `npm run users:demo` — синтетичні користувачі створені, вхід як `admin@example.test` працює
- [ ] Auth → URL Configuration: Site URL = прод-URL Vercel; Redirect URLs: `http://localhost:3000/**`, `https://*-<slug>.vercel.app/**`
- [ ] Секрети CI (Settings → Secrets → Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` — лише назви

## Vercel

- [ ] Проєкт імпортовано з форку (Hobby), Node 24.x — <!-- прод-URL -->
- [ ] Змінні в Production і Preview — лише дві: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (лише назви)
- [ ] `SUPABASE_SECRET_KEY` у Vercel не додано: коду застосунку першого зрізу він не потрібен, живе лише в `.env.local` для `npm run users:demo` (додати як тип Secret — коли його читає ваш серверний код)
- [ ] Після зміни змінних — редеплой
- [ ] Vercel Authentication для preview вимкнено (PM відкриває preview без входу)

## Перший PR

<!--
Перший PR у форку — цей файл (докази бутстрапу, день 0–1). Тестів з AC ID у назвах у ньому немає:
вони з'являються лише після PR, що злив sync/spec-v0.1, — до нього npm run ac:coverage падає з ORPHAN.
Якщо форк зроблено вже після тегу spec-v0.1, окремий PR із цим файлом впаде на conformance з NO-ROW, тож спершу
гілка sync/spec-v0.1 (README, «Шлях розробника», крок 6), а цей файл закомітьте в той самий sync-PR.
-->

- [ ] PR із цим файлом у форку: CI зелений (`spec`, `app`, `conformance`), preview відкривається — <!-- посилання -->
- [ ] Після merge у `main` job `db` виконав `supabase db push` — <!-- посилання на run -->
