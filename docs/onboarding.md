# Онбординг розробника

Дні 0–1. Мета — запустити застосунок локально проти **спільної бази команди** і злити перший PR.
Docker не потрібен: локально працює лише `npm run dev`, базу команди тримає Supabase, міграції застосовує CI.

## 1. Доступи (від PM)

- [ ] Інвайт у репозиторій команди прийнято (GitHub → сповіщення або `https://github.com/<pm>/<team-repo>/invitations`).
      Доступ — Write: гілки, PR, рев'ю, issues. Поки інвайт не прийнято, ви не можете бути рев'юером чи власником у CODEOWNERS.
- [ ] Інвайт в організацію Supabase команди прийнято, роль **Developer** (не Administrator — інакше проєкт команди
      займе один із ваших двох безкоштовних слотів Supabase).

## 2. Інструменти

- [ ] Node 24 (`node -v`), Git, GitHub CLI (`gh auth status`).
- [ ] OpenSpec CLI глобально, версія як у `package.json`: `npm i -g @fission-ai/openspec@1.14.1` → `openspec --version` = `1.14.1`.

## 3. Локальний запуск

```bash
git clone https://github.com/<pm>/<team-repo>.git
cd <team-repo>
npm ci
cp .env.example .env.local      # у PowerShell: Copy-Item .env.example .env.local
```

- [ ] У `.env.local` — **лише дві** змінні з Supabase Dashboard проєкту команди (Project Settings → API / Connect):
      `NEXT_PUBLIC_SUPABASE_URL` і `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SECRET_KEY` розробнику не потрібен
      (його має PM або техлід для `npm run users:demo`). Значення не комітимо й не вставляємо в чат.
- [ ] `npm run typecheck && npm test` — зелені.
- [ ] `npm run dev` → `http://localhost:3000` → вхід синтетичним користувачем (`*@example.test`; пароль — від PM або техліда
      в особистому повідомленні). Реєстрацію в Supabase вимкнено, тож нових користувачів створює лише `npm run users:demo`
      за списком `supabase/demo-users.json` (потрібен свій тестовий користувач чи роль — додайте запис `*@example.test`
      у PR «Онбординг», після merge PM або техлід запустить `npm run users:demo`).

## 4. Правила спільної бази

- Усі працюють з **однією** базою: свої тестові дані — лише синтетичні, своїм тестовим користувачем; чужі записи не видаляйте.
- Схему змінюємо **лише міграцією в PR**: `npx supabase migration new <назва>` → SQL → PR → `db-check` → рев'ю власника
  з CODEOWNERS → merge → `db-deploy` застосує її. **Ніколи** `supabase db push` з ноутбука, **ніколи** DDL у SQL Editor
  чи Table Editor: інакше база розійдеться з `main` і `db-deploy` впаде в усієї команди.

## 5. Перший PR — рядок у `docs/team.md`

```bash
git switch -c onboarding/<login>
# додайте рядок: | @<login> | розробник | <зона> |
git add docs/team.md && git commit -m "Onboarding: add <login> to docs/team.md"
git push -u origin onboarding/<login>
gh pr create --web           # браузер із шаблоном PR: позначте тип «Онбординг» (--fill шаблон пропускає)
```

- [ ] PR створено, CI зелений (`spec`, `app`, `conformance`, `db-check`); окремим коментарем — `@coderabbitai review`.
- [ ] Колега зробив рев'ю й approve (свій PR ви схвалити не можете); push після approve вимагає нового approve.
- [ ] Усі обговорення вирішено (ruleset: Require conversation resolution): коментар рев'ю чи CodeRabbit — виправте або
      дайте відповідь, потім **Resolve conversation** → **Squash and merge**.
- [ ] Конфлікт у `docs/team.md` (колеги додавали рядки одночасно) — залиште обидва рядки (див. коментар у файлі).

## 6. Далі

- Скіл `spec-clarify` → питання як issues `spec-question` (без дублікатів) → журнал `docs/spec-reading/<login>.md`.
- Задачі — issues «Задача» (мітка `task`): призначте себе, гілка `task/<N>-<коротко>`, PR з `Closes #N`.
- Рев'ю PR-ів колег: коментарі з посиланнями на рядки, конкретні пропозиції або обґрунтований approve.
