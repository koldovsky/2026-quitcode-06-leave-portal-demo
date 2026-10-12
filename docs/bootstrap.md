# Налаштування репозиторію команди — чекліст PM (день 0)

<!--
Заповнює PM одразу після заняття, у цьому порядку. Для кожного пункту — доказ: посилання (run CI, PR, preview),
назва змінної або знімок екрана в docs/img/ (без справжніх назв клієнта й людей: зображення spec:check не перевіряє).
ЗНАЧЕННЯ СЕКРЕТІВ І ПАРОЛІВ НІКОЛИ НЕ ПИШІТЬ — лише назви змінних і де вони задані.
Закомітьте цей файл PR-ом типу «Онбординг» (уже під ruleset-ом: approve будь-якого колеги — docs/ власника в CODEOWNERS не має). Пояснення кроків — README, «Шлях PM».
-->

Репозиторій команди: <!-- https://github.com/<pm>/<team-repo> --> · Прод-URL: <!-- https://<slug>.vercel.app -->
Техлід: <!-- @login --> · Організація Supabase: <!-- <team-slug> -->

## 1. GitHub: репозиторій і люди

- [ ] Репозиторій створено з шаблону (**Use this template → Create a new repository**), власник — особистий акаунт PM,
      **Public від першого push** і назавжди (коміти колег, запушені в приватний репозиторій, Vercel Hobby блокує, і після
      відкриття вони так і лишаються заблокованими; ruleset і CODEOWNERS на Free працюють лише в публічних репозиторіях) — <!-- посилання -->
- [ ] Settings → Collaborators → **Add people**: усі розробники (і викладач); інвайти **прийнято** — <!-- знімок docs/img/collaborators.png -->
- [ ] Мітки створено (форми issues не створюють відсутню мітку): `spec-question`, `task` —
      `gh label create spec-question --description "Питання до специфікації"` і `gh label create task --description "Задача зрізу"` — <!-- знімок Issues → Labels -->
- [ ] `.github/CODEOWNERS` заповнено логінами PM і техліда (коментар у файлі) і закомічено в `main` — <!-- посилання на коміт -->
- [ ] CodeRabbit (GitHub App) встановлено на цей репозиторій (github.com/apps/coderabbitai → Configure → Only select repositories) — <!-- знімок -->
- [ ] Посилання на репозиторій — у чаті команди

## 2. Supabase: одна база на команду

- [ ] Організацію `<team-slug>` і проєкт створено в акаунті PM (один із двох безкоштовних слотів PM; регіон — найближчий) — <!-- регіон -->
- [ ] Розробників запрошено в організацію роллю **Developer** (не Administrator: інакше проєкт займе слот розробника) — <!-- знімок Team -->
- [ ] Authentication: «Allow new users to sign up» **вимкнено**, «Confirm email» **вимкнено**
      (точне місце перемикачів у Dashboard звіряємо на репетиції) — <!-- знімки docs/img/auth-signups.png, docs/img/auth-email.png -->
- [ ] (Після кроку 4, коли є прод-URL) Authentication → URL Configuration: Site URL = прод-URL Vercel; Redirect URLs `http://localhost:3000/**`, `https://*-<slug>.vercel.app/**` — <!-- знімок -->

## 3. GitHub: environment `production` і секрети

- [ ] Settings → Environments → `production` (якщо перший прогін CI вже створив його автоматично — відкрийте наявний):
      **Deployment branches** = Selected branches → `main` — <!-- знімок -->
- [ ] Секрет environment `SUPABASE_DB_URL` = рядок **Session pooler** (порт **5432**, не 6543) з Supabase → **Connect**;
      пароль у рядку percent-encoded. Розробники його не бачать і пароля БД не отримують — <!-- лише назва секрету -->
- [ ] Запасний шлях (лише якщо `--db-url` не працює): секрети environment `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
      `SUPABASE_PROJECT_ID` (README, «Міграції в прод: запасний шлях») — <!-- не потрібно / назви -->
- [ ] (Необов'язково) секрет репозиторію `SPEC_DENYLIST` — справжні назви клієнта через кому; локально — `product/denylist.local.txt`

## 4. Vercel

- [ ] Add New → Project → імпорт репозиторію команди (імпортувати може лише власник особистого репозиторію — PM), Node 24.x — <!-- прод-URL -->
- [ ] Змінні Production і Preview — лише `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `SUPABASE_SECRET_KEY` — **ніколи** — <!-- знімок (лише назви) -->
- [ ] Settings → Deployment Protection → **Require Log In** вимкнено → Save (інакше колеги не відкриють preview) — <!-- знімок -->
- [ ] Після змінних — редеплой; прод-URL відкривається — <!-- посилання -->

## 5. База й перший зелений CI

- [ ] Actions → CI → **Run workflow** (гілка `main`, `include_seed` ✓) → job `db-deploy` застосував першу міграцію й сид — <!-- посилання на run -->
- [ ] `.env.local` PM: дві змінні + `SUPABASE_SECRET_KEY` + `DEMO_USER_PASSWORD` → `npm run users:demo` → вхід як `admin@example.test` працює (локально й на прод-URL)
- [ ] CI на `main` зелений: `spec`, `app`, `conformance`, `db-check`, `db-deploy` — <!-- посилання на run -->

## 6. Ruleset `main` (лише після зеленого CI на `main`)

- [ ] Settings → Rules → Rulesets → **New ruleset → Import a ruleset** → `team-main.json` з курсового репозиторію
      (`materials/rulesets/team-main.json`) або вручну: target `main`; Restrict deletions; Block force pushes;
      Require a pull request — **1 approval**, **Require review from Code Owners**, **Require approval of the most recent
      reviewable push**, *Dismiss stale approvals* — вимкнено, **Require conversation resolution**, Allowed merge methods —
      **Squash** і **Merge**; Require status checks (джерело GitHub Actions, без «up to date»): `spec`, `app`, `conformance`,
      `db-check`; Bypass list — **порожній**; Enforcement — Active — <!-- знімок docs/img/ruleset.png -->

## 7. Перевірка в перший день (smoke test)

- [ ] Власний PR PM без approve змерджити не можна — <!-- посилання на PR -->
- [ ] PR колеги: Vercel створив preview — <!-- посилання на preview -->
- [ ] Squash-merge PR колеги: прод-деплой Vercel пройшов (якщо Vercel пише «blocked… commit author…» — зливайте такі PR-и
      кнопкою **Create a merge commit** або Vercel → **Create Deployment** з `main`; рев'ю тоді — запуском гілки локально) — <!-- посилання -->
- [ ] PR із міграцією: `db-check` зелений, після merge `db-deploy` застосував її — <!-- посилання на run -->
- [ ] Свій рядок у `docs/team.md` (роль PM) — <!-- посилання на PR -->
