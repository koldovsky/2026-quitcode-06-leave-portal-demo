# RUNBOOK: демо «портал відсутностей» на WS6

Сценарій для ведучого: що показати на кожному тезі, які команди запустити, що має вийти і що робити,
якщо не вийшло (План Б). Окремо — кроки з акаунтами, які треба зробити **до заняття**.

Демо-репо `koldovsky/2026-quitcode-06-leave-portal-demo` — це **репо команди** в моделі «одна команда — один
репозиторій»: спека PM (`product/`, `openspec/`, теги `spec-vX.Y`) і код розробників (міграції, `src/`, тести, `docs/`)
живуть разом, у команді все потрапляє в `main` гілками й PR-ами з рев'ю колеги. На сцені автор грає всі ролі
(PM, техлід, розробник), тому:

- рев'ю колеги немає: ruleset демо-репо **без обов'язкового approve** і без «Require review from Code Owners»
  (автор не може схвалити свій PR, тож з цими правилами merge був би неможливий). Вголос: «у команді — 1 approve і
  CODEOWNERS» (`docs/bootstrap.md`, крок 6; `materials/rulesets/team-main.json` домашки);
- `.github/CODEOWNERS` і `docs/team.md` містять лише `@koldovsky`;
- історія етапів позначена тегами в `main`, щоб на сцені було видно весь шлях. Теги — історичні чекпойнти,
  їх не переносимо: зроблені до 12.10.2026, у попередній моделі курсу, тож CI, README і службові файли на них описують
  ту модель. Чинний процес — на `main`.

| Тег | Роль | Що в ньому | Блок деки |
|---|---|---|---|
| `demo-01-template` | PM | шаблон + `product/` (vision, glossary, roles з матрицею, roadmap WS7–WS11, denylist) | 2, 4 |
| `spec-v0.1` | PM | зміна `add-leave-request` заархівована → `openspec/specs/leave-requests/spec.md`, CHANGELOG | 2 (демо 1) |
| `demo-02-clarify` | dev + PM | `docs/spec-reading.md` (Q1–Q5; на `main` — `docs/spec-reading/koldovsky.md`), `docs/demo/issues/Q1…Q5.md`, відповіді в `product/decisions.md`, рядки матриці «відкладено» | 3 (демо 2) |
| `demo-03-impl` | dev | `impl-leave-request` (design, tasks), міграція з RLS, `src/lib/leave`, сторінки, тести AC-LEAVE-01…09 | 4 (демо 3) |
| `spec-v0.2` | PM | `clarify-leave-rules`: MODIFIED 01/02/04/05, ADDED AC-LEAVE-10, 11; diff — `docs/demo/spec-v0.2-diff.txt` | 5 (демо 4) |
| `demo-04-sync` | dev | дрейф (`docs/demo/drift-ci.txt`) → `impl-clarify-leave-rules` → AC-LEAVE-01…11 «реалізовано» | 5 (демо 4) |

Проміжні точки, які теж знадобляться:

| Посилання | Стан |
|---|---|
| `spec-v0.1~1` | активна зміна `openspec/changes/add-leave-request/` (до archive) |
| `demo-02-clarify~2` | питання Q1–Q5 поставлено, відповідей ще немає («очікуємо») |
| `spec-v0.2~1` | активна зміна `openspec/changes/clarify-leave-rules/` — для `openspec show --diff` |
| `demo-04-sync~6` | spec-v0.2 злито, `ac:coverage` червоний, вивід збережено в `docs/demo/drift-ci.txt` |

## 0. Локальна підготовка (за день до заняття)

1. Node 24 (`node -v`), у корені репозиторію `npm ci`.
2. OpenSpec: усі команди тут — через `npx openspec …` (версія з `package.json`, 1.14.1). Команди `/opsx:*`
   у Claude Code викликають **глобальний** `openspec`; на машині автора зараз глобально **1.13.0** — до демо 1
   оновіть: `npm i -g @fission-ai/openspec@1.14.1` → `openspec --version` = `1.14.1` (пункт є й у чеклисті 1.6).
   Телеметрія: `OPENSPEC_TELEMETRY=0`.
3. Окрема тека на кожен тег, щоб не перемикати гілки на сцені й не загубити цей файл (він є лише на `main`):

   ```bash
   cd D:/projects/clients/quitcode/2026-quitcode-06-leave-portal-demo
   for t in demo-01-template spec-v0.1 demo-02-clarify demo-03-impl spec-v0.2 demo-04-sync; do
     git worktree add --detach "../lp-$t" "$t"
     (cd "../lp-$t" && npm ci --no-audit --no-fund)
   done
   ```

   Для проміжних станів — у потрібній теці `git switch --detach spec-v0.1~1` (і назад `git switch --detach spec-v0.1`).
   Без worktree: `git switch --detach <тег>` в основній теці (`node_modules` той самий, якщо `npm ci` зроблено на `main` — `package.json` між тегами
   не змінюється; на `main` лише додано devDependency `@electric-sql/pglite` для тестів бази й прибрано два npm-скрипти — тегам це не заважає).
   Усе, що звертається до хмари (`npm run users:demo`, локальний `npm run dev`), — **лише в основній теці на `main`**:
   ключі живуть у `.env.local`, він у `.gitignore`, тож у теках `lp-*` його немає (розділ 1.2). Міграції в базу демо
   з ноутбука не застосовуємо — лише job `db-deploy` у CI (розділ 1.1, крок 5).
4. У кожній теці прогнати ворота й звірити з таблицею «Очікувані результати» (розділ 3):
   `npm run lint && npm run typecheck && npm test && npm run build && npm run spec:validate && npm run spec:check && npm run ac:coverage`.
5. Локальний denylist (для показу в блоці 2): `npm run spec:check` читає `product/denylist.local.txt`
   (він у `.gitignore`) з робочої копії своєї теки, тож файл потрібен у **кожній теці, де на сцені запускаєте
   `spec:check`**: спершу `lp-demo-01-template` (демо 1, крок 2), потім `lp-spec-v0.1` (демо 1, кроки 4–8;
   `spec:check` — крок 6). Створіть його в `lp-demo-01-template`, впишіть 2–3 вигадані слова-замінники (наприклад, «Зразкова Школа», «Тестенко») — по одному в рядку, — і скопіюйте в другу теку. Справжніх назв на машині сцени не тримаємо: у цих теках наживо працює агент (демо 1, крок 3; демо 2, крок 1), а на тегах йому не заборонено читати цей файл. Для показу механізму досить того, що spec:check друкує «слово #N».

   ```bash
   cd D:/projects/clients/quitcode/lp-demo-01-template
   cp product/denylist.local.txt ../lp-spec-v0.1/product/
   ```

   `npm run spec:check` має лишитись **OK**, а знайдені збіги друкуються як «слово #N із product/denylist.local.txt»,
   без значень. Файл переживає `git switch --detach` і скидання `git clean -fd openspec docs`, але не
   перестворення теки (`git worktree remove --force`: План Б у демо 1, крок 3а, і демо 2, крок 2а) — після нього
   скопіюйте знову. Цей файл не комітимо; із замінниками його можна показати на екрані (слайд 17).

## 1. Акаунти — зробити до заняття (автор, своїми руками)

Нічого з цього не робиться автоматично. Значень секретів ніде не записуємо — лише назви.
Акаунти автора, потрібні для заняття: GitHub, Supabase, Vercel, Claude Code (Anthropic), хост Zoom.

### 1.1 GitHub: репо команди

Репозиторій уже є (публічний, з історією й тегами, issues #1–#5, PR #6 `demo/first-pr`). Перебудова під одне репо
приходить PR-ом у `main`; порядок після нього:

1. **PR перебудови злито** (merge commit, теги не чіпаємо). Push у `main` запускає CI з п'ятьма jobs: `spec`, `app`,
   `conformance`, `db-check` — зелені; `db-deploy` — зелений або пропущений з повідомленням (крок 5).
   `db-check` (`supabase db start` — шість міграцій і сид на одноразовій базі в раннері) на цьому репо ще не
   запускався: перший прогін у PR перебудови і є перевіркою. Червоний — дивитись лог кроку «Apply all migrations
   and seed…»; на сцені тоді План Б демо 3 (знімки).
2. **Мітки** (форми issues не створюють відсутню мітку): `spec-question` уже є; додати `task`:

   ```bash
   R=koldovsky/2026-quitcode-06-leave-portal-demo
   gh label create task --repo $R --description "Задача зрізу"
   ```

   Issues #1–#5 (питання Q1–Q5 з `docs/demo/issues/Q*.md`, закриті з відповідями PM) створено раніше; якщо репо
   доведеться відтворювати з нуля — цикл `gh issue create … --label spec-question --body-file docs/demo/issues/Q$i.md`
   до будь-якого PR, щоб номери були #1…#5, як у `product/decisions.md` і журналі.
3. **Ruleset `main`** — лише **після** зеленого CI на `main` з новим `ci.yml` (інакше `conformance` і `db-check`
   ще не з'являться в списку перевірок): Settings → Rules → Rulesets → наявний ruleset `main` → Require status checks
   to pass: `spec`, `app`, **`conformance`**, **`db-check`** (джерело GitHub Actions, без «up to date»); Require a pull
   request — **Required approvals: 0**, «Require review from Code Owners» — **вимкнено** (пояснення — на початку
   файлу); Block force pushes, Restrict deletions; Bypass list порожній. У репо команди — `team-main.json` з домашки
   (1 approve, Code Owners, approval of the most recent push, conversation resolution, Squash і Merge).
   Імпорт JSON-файлу ruleset-у через API: `gh api repos/<owner>/<repo>/rulesets --method POST --input <файл>`
   (у Git Bash для шляхів, що починаються з `/`, — `MSYS_NO_PATHCONV=1`).
4. **CODEOWNERS** приходить у PR перебудови (`.github/CODEOWNERS`, чотири шляхи → `@koldovsky`). Collaborators на
   сцені лише показуємо (Settings → Collaborators, як є); у команді PM додає всіх розробників, і інвайти мають бути прийняті.
5. **Environment `production` і `SUPABASE_DB_URL` — необов'язково, але бажано для демо 3** (показ «база через
   `db-deploy`»). Settings → Environments → `production` (якщо перший прогін уже створив його — відкрити наявний) →
   Deployment branches = Selected branches → `main` → Add environment secret `SUPABASE_DB_URL` = рядок **Session pooler**
   демо-проєкту з Supabase → **Connect** (порт 5432; пароль БД у рядку percent-encoded). Потім Actions → CI →
   **Run workflow** на `main` **без** `include_seed` (базу й сид застосовано 11.10, розділ 1.2) → у лозі `db-deploy`
   крок «Dry run» має сказати, що застосовувати нічого (точний текст CLI 2.120 з `--db-url` звіряємо на цьому прогоні;
   локальний `db push --dry-run` 12.10.2026 відповів «Remote database is up to date.»).
   Без секрету `db-deploy` зелений, але крок пропущено з повідомленням «Секрет SUPABASE_DB_URL в environment production
   не задано — міграції не застосовано (db push пропущено).» — тоді в демо 3 показуємо це повідомлення й Dashboard →
   Migrations і кажемо, як виглядає лог із секретом.
   `include_seed` на демо **не** запускаємо: сид уже застосовано, повторювати нема потреби.

### 1.2 Supabase (власна організація, не через Vercel Marketplace)

Проєкт демо створено й наповнено 11.10.2026 (шість міграцій і сид — локальним `supabase db push`, ще до моделі одного
репо; на сцені й надалі — лише через CI). Що має бути налаштовано:

1. Проєкт на Free (2 активні проєкти на акаунт). Пароль БД — у менеджері паролів (він же в рядку Session pooler, крок 1.1.5).
2. Authentication (точний шлях у Dashboard звіряємо на репетиції):
   - Email → вимкнено **Confirm email** (вбудований SMTP — 2 листи/год і лише членам команди; користувачів створює скрипт);
   - вимкнено **Allow new users to sign up**. Публічний ключ (publishable) є в JS-бандлі прод-URL: з увімкненою
     реєстрацією будь-хто зареєструється через Auth API, одразу увійде (підтвердження вимкнено) з роллю
     `employee` і зможе подавати заявки. `npm run users:demo` — це Admin API: з вимкненою реєстрацією він працює
     й у хмарі (перевірено 11.10.2026). Локально те саме задає `[auth] enable_signup = false` у `supabase/config.toml`.
3. **Міграції й сид** — у Dashboard → Database → Migrations шість міграцій: `20261012000000_profiles_and_roles`,
   `20261013000000_leave_requests`, `20261016000000_leave_rules_v0_2`, `20261017000000_require_leave_records`,
   `20261018000000_manager_helpers_require_role`, `20261019000000_enforce_leave_rules_in_db`.
   Відтворити базу з нуля (новий проєкт) — тим самим шляхом, що в команди: секрет `SUPABASE_DB_URL` (крок 1.1.5) →
   Actions → CI → **Run workflow** на `main` з `include_seed` ✓ → `db-deploy` застосує шість міграцій і
   `supabase/seed.sql` (підрозділи й заблокований день 05.11.2026).
   **Ніколи** `supabase migration repair` на цій базі, навіть якщо CLI сам його пропонує: він переписує історію
   міграцій у базі. У `.claude/settings.json` (агент) заборонені й `supabase db push`, і `migration repair`.
4. `.env.local` в основній теці за зразком `.env.example` (Project Settings → API Keys): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DEMO_USER_PASSWORD` (≥ 8 символів, свій). Потім:

   ```bash
   npm run users:demo
   ```

   Очікувано (п'ять рядків і підсумок «Готово, користувачів: 5…»; пароль не друкується; повторний запуск оновлює наявних):

   ```text
   ✔ admin@example.test — створено, роль admin
   ✔ manager.math@example.test — створено, роль manager (менеджер MATH)
   ✔ manager.primary@example.test — створено, роль manager (менеджер PRIMARY)
   ✔ teacher@example.test — створено, роль employee (main MATH, additional PRIMARY)
   ✔ teacher2@example.test — створено, роль employee (main PRIMARY)
   ```

   «підрозділу MATH немає» → не застосовано сид: Actions → CI → Run workflow з `include_seed` (крок 3).
5. (Необов'язково) Типи: готовий `database.types.ts` — у Summary прогону `db-check`; або `npm run db:types` (потрібен
   `supabase link`), після нього — `npm run typecheck`. Якщо впав — `git restore src/lib/supabase/database.types.ts` (рукописні типи робочі).
6. Authentication → URL Configuration (після кроку Vercel): Site URL = прод-URL Vercel; Redirect URLs:
   `http://localhost:3000/**` і `https://*-<slug-акаунта-vercel>.vercel.app/**`.
7. Free-проєкт засинає після ~7 днів без активності: за день до заняття відкрийте Dashboard і застосунок.

### 1.3 Vercel (Hobby)

1. Add New → Project → Import `koldovsky/2026-quitcode-06-leave-portal-demo` (Node 24.x береться з `engines`).
   Імпортувати особисте репо може лише його власник — у команді це PM.
2. Environment Variables для **Production і Preview**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SECRET_KEY` застосунку цього зрізу не потрібен (лише
   скрипту `users:demo` локально) — у Vercel його не додаємо. Не через Marketplace-інтеграцію Supabase.
3. Settings → Deployment Protection → **Vercel Authentication**: перемикач **Require Log In** вимкнути → **Save**
   (на новому Hobby-проєкті він увімкнений зі «Standard Protection»; без цього колеги не відкриють preview).
4. Deployments → Redeploy (змінні діють лише для нових деплоїв). Відкрити прод-URL → `/login`.
5. Повернутись до кроку 1.2.6 (Site URL і Redirect URLs).

### 1.4 PR з `AC-LEAVE-01` для демо 3 (PR #6, `demo/first-pr`)

PR створено 11.10.2026: гілка `demo/first-pr`, один тест у `tests/leave/submission.test.ts`:

```ts
  it("AC-LEAVE-01: дата початку в минулому дозволена (хворобу оформлюють після повернення)", () => {
    const result = validateSubmission(
      { leaveType: "sick", startDate: "2026-09-01", endDate: "2026-09-02", positionIds: ["pos-single-main"] },
      singlePosition,
    );
    expect(result.ok).toBe(true);
  });
```

Його останній прогін CI — ще зі старим `ci.yml` (`conformance` skipped, `db-check` немає). Повторний запуск
(Re-run) бере той самий старий коміт злиття, тож **після merge PR перебудови** оновіть гілку (за кілька годин до
заняття — CI і preview потребують часу):

```bash
cd D:/projects/clients/quitcode/2026-quitcode-06-leave-portal-demo
git fetch origin
git switch demo/first-pr && git merge --no-edit origin/main
npm test && git push
git switch main   # основна тека лишається на main (демо 3, План Б кроків 9–10)
```

Або кнопка **Update branch** у PR. Очікувано: у PR зелені **`spec`, `app`, `conformance`, `db-check`** (`db-deploy`
у PR не запускається), коментар Vercel з preview-URL. Рядок AC-LEAVE-01 у матриці вже «реалізовано», тож
`conformance` зелений. Після заняття PR можна злити (approve ruleset демо не вимагає) або закрити.

Чому тут PR одразу з тестом за AC ID: spec-v0.1 у цьому репо вже на `main`. **У команді перший PR кожного — рядок
у `docs/team.md`** (тип «Онбординг», `docs/onboarding.md`), а тести з AC ID приходять у PR-ах задач після тегу
spec-v0.1 (тест з AC, якого ще немає в `openspec/specs/` на `main`, дає ORPHAN). Скажіть це на сцені (демо 3, крок 8).

### 1.5 Репетиція (обов'язково)

- Пройти розділ 2 повністю на прод-URL, з трьома вікнами браузера (звичайне, інкогніто, інший браузер)
  для `teacher@`, `manager.math@`, `manager.primary@`.
- **RLS вручну (AC-LEAVE-09):** `teacher2@` не бачить заявок `teacher@`; `manager.math@` бачить лише записи
  `main` посад «Математики»; `admin@` бачить усе на `/manage`, але без кнопок рішення.
- **Реєстрація вимкнена (крок 1.2.2):** повторний `npm run users:demo` проходить без помилок (Admin API),
  самостійна реєстрація з публічним ключем — `422 signup_disabled`, «Signups not allowed for this instance»
  (перевірено 11.10.2026).
- **CI нового `ci.yml`:** прогін на `main` після PR перебудови (крок 1.1.1) і в PR #6 після оновлення гілки (1.4) —
  чотири зелені перевірки; лог `db-deploy` (крок 1.1.5).
- **Знімки для Планів Б** — зробити на репетиції й зберегти поза репозиторієм (наприклад, `D:/projects/clients/quitcode/demo-shots/`),
  перед заняттям відкрити у вкладках: демо 1 — крок 5 (`openspec validate add-leave-request --strict`) і крок 6а
  (звіт `spec-review`); демо 3 — крок 6 (Settings → Collaborators, Rules → ruleset `main`, Environments → `production`
  з назвою секрету, `.github/CODEOWNERS`, лог `db-deploy` і Dashboard → Database → Migrations, шість міграцій), крок 7 (Vercel →
  Environment Variables, лише назви, і Deployment Protection), крок 8 (PR #6: зелені `spec`, `app`, `conformance`,
  `db-check` і коментар Vercel). На знімках — лише демо-акаунт, без клієнтських організацій у перемикачах.
  Прогонів CI на тегах немає (CI запускають лише PR, push у `main` і ручний запуск): для Плану Б — прогін
  у PR #6 або на `main`.
- **Останній крок — скинути заявки.** Репетиція лишає заявки `teacher@` (10.11–12.11) і `teacher2@` (03.11–06.11);
  на сцені вони дали б «На ці дати у вас уже є заявка на розгляді або схвалена.» замість «Заявку подано»
  (демо 3, крок 9; демо 4, крок 8). Dashboard → SQL Editor: `delete from public.leave_requests;`
  (записи видаляються каскадом; підрозділи, посади й користувачі лишаються), потім
  `select count(*) from public.leave_records;` → 0. Це дані, не схема, тож SQL Editor тут доречний
  (DDL — лише міграцією в PR).

#### Факти репетиції 11.10.2026 (CLI 2.120.0, Vercel CLI 59.25.0)

- `npx supabase projects create … --org-id … --region eu-central-1` — проєкт `ACTIVE_HEALTHY` приблизно за хвилину.
- `db push --dry-run --include-seed` показав 5 міграцій і `supabase/seed.sql` (шоста, `20261019…`, з'явилась після репетиції — див. пункт про RLS); `db push --include-seed` питає
  `[Y/n]` двічі (міграції, потім сид) і застосовує все без помилок. 12.10.2026 `db push --dry-run` відповів
  «Remote database is up to date.» (усі 6 міграцій). Це був локальний шлях до моделі одного репо; тепер — `db-deploy`.
- `npx supabase projects api-keys` **маскує** секретний ключ (`sb_secret_…` з `·`): з таким ключем `users:demo`
  падає з «Invalid API key». Беріть ключ у Dashboard (Project Settings → API Keys) або `api-keys --reveal`.
- У новому проєкті поруч із `sb_publishable_…`/`sb_secret_…` усе ще є legacy-ключі `anon` і `service_role` —
  у `.env.local` беремо лише нові.
- `vercel link` дописує в `.env.local` `VERCEL_OIDC_TOKEN`, а в кінець `.gitignore` — `.vercel` і `.env*`
  (останній рядок знову ховає `.env.example`): `git checkout -- .gitignore` після нього.
- Змінні, додані через `vercel env add`, мають тип Config; для двох `NEXT_PUBLIC_…` це правильно.
- Новий Hobby-проєкт Vercel: `ssoProtection: all_except_custom_domains` — preview й адреси деплоїв за входом у Vercel,
  прод-аліас `*.vercel.app` відкривається всім. Вимкнути — Settings → Deployment Protection (крок 1.3.3).
- Реєстрацію вимкнено: самостійна реєстрація з публічним ключем → `422 signup_disabled` («Signups not allowed for this
  instance»); повторний `npm run users:demo` (Admin API) проходить.
- **RLS на справжньому Postgres** (скрипт синтетичними користувачами): чужі заявки не видно, власний запис не
  схвалити, запис чужого підрозділу не змінити, роль собі не підвищити, заявку без записів не зберегти, anon нічого не
  бачить, повернення без коментаря відхилено. **Знайдено:** прямий виклик RPC обходив AC-LEAVE-10/11 (перевірки були
  лише в server action) → міграція `20261019000000_enforce_leave_rules_in_db.sql` (зміна `harden-leave-rules-db`).
- **CodeRabbit** на PR #6: конфіг із репозиторію застосовано (рев'ю українською, 6 наших custom checks, перевірки
  docstrings немає). Опис PR не за шаблоном → попередження «Description check»; назви checks CodeRabbit
  показує з власною капіталізацією («тип Pr і межі змін») — це косметика. Рев'ю на запит — коментар `@coderabbitai review`.
- *Історичне — модель із форками (до 12.10.2026), для нинішнього процесу не потрібне:* Actions у новому форку
  вимкнені, доки людина не ввімкне їх на вкладці Actions; скрипт `spec:source` порівнював форк із тегом PM і пройшов
  на `spec-v0.2.1`. У моделі одного репо форків і `spec:source` немає.

### 1.6 Чекліст за годину до заняття

- [ ] PR перебудови під одне репо злито; CI на `main` зелений: `spec`, `app`, `conformance`, `db-check`; `db-deploy` —
      зелений (з секретом — лог «нічого застосовувати», без секрету — повідомлення про пропуск; крок 1.1.5).
- [ ] Ruleset демо-репо: обов'язкові `spec`, `app`, `conformance`, `db-check`; **0 approvals**, без Code Owners (крок 1.1.3).
- [ ] PR #6 `demo/first-pr` оновлено з `main` (крок 1.4): чотири зелені перевірки й preview Vercel.
- [ ] Мітки `spec-question` і `task` є (крок 1.1.2); Issues → New issue показує форми «Питання до специфікації» і «Задача»
      (форми читаються з `main`, тож з'являються лише після merge PR перебудови).
- [ ] Глобальний OpenSpec: `openspec --version` = `1.14.1` (інакше `/opsx:*` у демо 1 працюють зі старою версією;
      оновити: `npm i -g @fission-ai/openspec@1.14.1`, крок 0.2).
- [ ] Таблиця `leave_requests` порожня (після репетиції — `delete from public.leave_requests;`, крок 1.5).
- [ ] Supabase-проєкт не на паузі (Dashboard відкривається), Database → Migrations — шість міграцій; вхід на прод-URL
      (`https://quitcode-ws6-leave-portal-demo.vercel.app`) як `teacher@` працює.
- [ ] Термінали: основна тека на `main` (План Б кроків 9–10 демо 3) і теки `lp-*`. Локальний `main` оновлено
      після merge PR перебудови (`git switch main && git pull`): демо 4, крок 5 читає `docs/demo/spec-v0.2-new-ac-rows.md`
      саме з локальної гілки `main` (теки `lp-*` на тегах перестворювати не треба — теги не змінились).
- [ ] Вкладки: PR #6, issues #1–#5, Settings → Collaborators / Rules / Environments, `.github/CODEOWNERS` на GitHub,
      Actions → останній прогін CI на `main` (job `db-deploy`), Supabase → Database → Migrations, Vercel → Environment
      Variables і Deployment Protection, три вікна браузера (крок 1.5).
- [ ] Zoom: увімкнено breakout rooms; створено 4 кімнати (property-workflows, therapy-scheduling, school-purchasing, leave-portal) і розподілено учасників за списком команд від клієнта; таймер — за слайдом 25 (≈1 хв — відкрити кімнати; у Zoom увімкнути зворотний відлік 30 с).
- [ ] Сповіщення ОС, месенджерів і пошти вимкнено (режим «Не турбувати»); вкладки з поштою закрито.
- [ ] Claude Code: виконано вхід; у кожній теці lp-* уже пройдено запит довіри до теки і запит про сервер із .mcp.json (відхилити: MCP для демо 1–2 не потрібен).
- [ ] Акаунти на екрані (GitHub, Vercel, Supabase): перевірити, що в перемикачах немає клієнтських організацій; якщо є — окремий профіль браузера з демо-акаунтами. У SQL Editor перед Run — звірити назву проєкту.
- [ ] Основна тека — на гілці main (`git branch --show-current`).
- [ ] Знімки для Планів Б (крок 1.5) відкрито у вкладках.
- [ ] Шаблон і домашка — публічні; шаблон позначено як **Template repository** (`gh repo edit koldovsky/2026-quitcode-06-project-template --template`), інакше в PM немає кнопки «Use this template» і `gh repo create --template` падає (walkthrough-pm, крок 1 — PM роблять це одразу після заняття). Перевірка: `gh repo view koldovsky/2026-quitcode-06-project-template --json isTemplate --jq .isTemplate` → `true`. Деку зібрано на Pages.

## 2. Сценарій на сцені

Скрізь: шрифт термінала ≥ 18 pt, `OPENSPEC_TELEMETRY=0`, вкладки браузера відкриті заздалегідь.
Кожен живий запуск агента (демо 1, кроки 3 і 6а; демо 2, кроки 1–2) — ліміт 2 хв від запуску, далі План Б без очікування.

### Демо 1 — PM: спека, з якою працюють і людина, і агент (блок 2) — `demo-01-template` → `spec-v0.1`

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | Тека `lp-demo-01-template`: `product/vision.md`, `glossary.md`, `roles.md` (матриця роль × сутність × дія), `roadmap.md` | зріз на кожне заняття WS6–WS11 | файли на GitHub на тезі `demo-01-template` |
| 2 | `product/denylist.txt` + пояснити `denylist.local.txt` і секрет `SPEC_DENYLIST`; `npm run spec:check` | `слів у denylist: 3` (+ локальні) → `OK` | показати рядок `## 4. Denylist` у `scripts/check-spec.mjs` і тест `reads words from the local product/denylist.local.txt` (`npx vitest run tests/scripts/check-spec.test.ts`) |
| 3 | Наживо, ~1,5 хв (слайд 16), ліміт 2 хв: показати перші 1–2 питання агента, далі План Б. Тека `lp-demo-01-template`, Claude Code: «Ось бриф зрізу «Подання заявки на відсутність і рішення менеджера». Спершу проінтерв'юй мене: по одному питанню, з варіантами. Нічого не вигадуй — чого я не знаю, пиши в Open questions.» → `/opsx:propose add-leave-request` (бриф: працівник подає заявку на відсутність на одну або дві посади, менеджер підрозділу схвалює або повертає з коментарем). Відповідаємо лише на 2 перші питання, далі — крок 4 з готовою зміною; повний прогін — агент ставить PM питання, пише `proposal.md` і дельту (а також `design.md` і `tasks.md` — у PM-зміні їх не лишаємо, див. нотатки слайда) | агент питає по одному, з варіантами (ролі й посади, хто погоджує, заблоковані дні, помилки для працівника); після 2 відповідей — Esc і крок 4 | не чекати агента: перервати (Esc), перейти в теку `lp-spec-v0.1` і виконати крок 4 (`git switch --detach spec-v0.1~1`). У `lp-demo-01-template` після часткового прогону switch впаде на невідстежуваних файлах — цю теку скидає крок 3а після демо |
| 3а | Після живого `/opsx:propose` (після демо) скинути теку `lp-demo-01-template`: `git restore . && git clean -fd openspec docs` | `git status` порожній | перестворити теку: `git worktree remove --force ../lp-<тег>` і `git worktree add --detach ../lp-<тег> <тег>` |
| 4 | `git switch --detach spec-v0.1~1` → `openspec/changes/add-leave-request/proposal.md` (Users & roles, Non-goals, Assumptions, Open questions Q4–Q5) і `specs/leave-requests/spec.md` | 5 вимог, AC-LEAVE-01…09 | GitHub, коміт `Propose add-leave-request…` |
| 5 | `npx openspec validate add-leave-request --strict` | `Change 'add-leave-request' is valid` | скрін з репетиції |
| 6 | `npm run spec:check` | `сценаріїв: 9 … OK` | вивід з таблиці розділу 3 (рядок `spec-v0.1`) |
| 6а | Скіл `spec-review` (тека `lp-spec-v0.1` на `spec-v0.1~1`, слайд 17): «Перевір зміну add-leave-request скілом spec-review» — показати звіт, правок не підтверджувати; ліміт 2 хв, далі План Б | 2–4 зауваження; найімовірніше, знайдеться AC-LEAVE-04 (THEN без результату). Скіл недетермінований — формулювання інші | пропустити й показати знімок звіту з репетиції (розділ 1.5) |
| 7 | `npx openspec archive add-leave-request -y` | `+ 5 added`, `archived as '<дата>-add-leave-request'` | показати тег `spec-v0.1` |
| 8 | Скинути: `git restore . && git clean -fd openspec && git switch --detach spec-v0.1`; показати `openspec/specs/leave-requests/spec.md` і `product/CHANGELOG.md` | канонічна спека з `## Purpose` українською | відкрити ці файли на GitHub на тезі `spec-v0.1` |

Наголос: `validate --strict` перевіряє структуру, а не зміст — AC-LEAVE-02 і AC-LEAVE-04 проходять, хоча неоднозначні.

Кроки 7–8 (і демо 4, крок 3) показують archive на відокремленому HEAD лише для наочності. У команді порядок
релізу такий: гілка `spec/<id>` → PR → рев'ю техліда (CODEOWNERS) → у тій самій гілці, до merge, archive + запис у
`product/CHANGELOG.md` + рядки нових AC у `docs/conformance.md` зі статусом «відкладено (новий AC — чекає задачі)» →
merge → `git switch main && git pull` → `git tag spec-vX.Y` → `git push origin spec-vX.Y`. На тезі `spec-v0.1` демо
рядків матриці ще немає (`ac:coverage` червоний — розділ 3): це історичний стан, у команді PR PM без них не зіллється.

### Демо 2 — Dev: прочитати, уточнити, розбити (блок 3) — `spec-v0.1` → `demo-02-clarify`

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | Тека `lp-spec-v0.1`, Claude Code: «Уточни спеку spec-v0.1 скілом spec-clarify» | таблиця 11 категорій (лише в чаті — див. примітку під таблицею), потім по одному питанню з варіантами й рекомендацією; якщо агент (старіша версія скіла на тезі) запропонує `gh issue create` — відповісти «ні»: issues #1–#5 уже є, а в учасників — вебформа (слайд 23) | ліміт 2 хв (разом із кроком 2): не встигли — перервати й показати збережені питання: `git show demo-02-clarify~2:docs/spec-reading.md`, розділ «Питання до PM» (команда з `sed` — під таблицею) |
| 2 | Пройти 2–3 питання наживо (Q1, Q2, Q3) у межах того самого ліміту 2 хв | Q1: «покриває обидві посади»; Q2: заблокований день — прийняти чи відхилити; Q3: дві черги | `git show demo-02-clarify~2:docs/spec-reading.md`, розділ «Питання до PM» — команда під таблицею (стан «очікуємо»). Команда лише читає з git, тож працює й після живого прогону скіла; `git switch` тут відмовить, бо скіл уже змінив файл |
| 2а | Після живого прогону скіла скинути теку: `git restore . && git clean -fd openspec docs` (скіл на тезі пише в `docs/spec-reading.md`) | `git status` порожній | перестворити теку: `git worktree remove --force ../lp-<тег>` і `git worktree add --detach ../lp-<тег> <тег>` |
| 3 | `docs/demo/issues/Q2.md` → на GitHub відкрити issue #2 (створене заздалегідь, крок 1.1.2) | поля форми `spec-question` | файл `Q2.md` на екрані |
| 4 | `product/decisions.md` на `demo-02-clarify` | Q1–Q5 з відповідями й «spec-v0.2 (готується)» | закриті issues #1–#5 з коментарями PM на GitHub |
| 5 | `docs/spec-reading.md` на `demo-02-clarify`: «Відповідь PM», «Власні припущення»; варіанти A–D кожного питання — у `docs/demo/issues/Q*.md` | колонки «Відповідь PM» і «Рішення» заповнені | `git diff demo-02-clarify~2 demo-02-clarify -- docs/spec-reading.md` |
| 6 | `npm run ac:coverage` на `spec-v0.1`, потім на `demo-02-clarify` | спершу `FAIL … NO-ROW (9)`, потім `OK`: 9 рядків «відкладено (…)» | вивід у таблиці розділу 3 |

На тегах журнал лежить у `docs/spec-reading.md`; на `main` він переїхав у `docs/spec-reading/koldovsky.md` — у команді
кожен розробник веде свій файл `docs/spec-reading/<login>.md` (`docs/spec-reading/README.md`), а питання ставить
issue `spec-question` у тому ж репо (спершу пошук: якщо питання вже є — коментар у ньому, а не дублікат).

План Б кроків 1–2 — збережені питання (стан «очікуємо»), з будь-якої теки, без зміни робочої копії:

```bash
git show demo-02-clarify~2:docs/spec-reading.md | sed -n '/^## Питання до PM/,/^## Власні припущення/p'
```

Скіл `spec-clarify` на тезі `spec-v0.1` — старіша версія: кроку, що записує скан у розділ `## Скан за таксономією`
журналу, у ньому ще немає (його додано на `main`): наживо агент покаже таблицю 11 категорій
у чаті, але записати її у файл скіл цієї версії не просить. Ця ж версія ще пропонує виконати `gh issue create` після «так» — на сцені не погоджуватись. Збережений скан показуйте з `demo-02-clarify~2`
(команда лише читає з git, працює з будь-якої теки й не змінює робочу копію):

```bash
git show demo-02-clarify~2:docs/spec-reading.md | sed -n '/^## Скан за таксономією/,/^## Питання до PM/p'
```

Скіл недетермінований: формулювання будуть інші, але п'ять неоднозначностей мають знайтись. AC-LEAVE-04 у скані
позначають дві категорії: «Граничні випадки й збої» (її вказано в issue Q2) і «Сигнали завершеності» (THEN без
результату). Якщо агент пропустив Q2 — показати, як друга з них її ловить.

### Демо 3 — Старт з нуля: репо команди (блок 4) — `main` і `demo-03-impl`

Бюджет на сцені — 6,5 хв (слайди 33–34): обов'язкові кроки 6–8. Кроки 1–5 (їх зміст уже на слайдах 24, 32 (CI) і 46 (додаток)) і 9–12 — «якщо є час».
З них першим — один прод-флоу з нотаток слайда 34: `teacher@` подає заявку (крок 9) → `manager.math@` схвалює (крок 10), ≈1,5 хв.
Кроки 11–12 без часу — лише команди з колонки «План Б» (`npx vitest run -t "AC-LEAVE-07"`, `-t "AC-LEAVE-08"`).

Що наживо, а що екранами: налаштування репо (крок 6а) лише **відкриваємо** в Settings і нічого не змінюємо;
лог `db-deploy` і Dashboard → Migrations (крок 6б) — живі сторінки; терміналу в кроці 6 немає — `db push` з ноутбука
на сцені не запускаємо (у команді ніхто не застосовує міграції з ноутбука). Команди розробника зі слайда 33
(`git clone`, `npm ci`, `.env.local`, `npm run dev`) лише проговорюємо: у демо все зроблено заздалегідь.

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 (якщо є час) | `openspec/changes/archive/*-impl-leave-request/design.md` (таблиця прав) і `tasks.md` («Done when: AC-…») | `skip_specs: true` у `.openspec.yaml` | файли на GitHub на тезі `demo-03-impl` |
| 2 (якщо є час) | `supabase/migrations/20261013000000_leave_requests.sql`: порядок зміни ролей, `revoke` + колонкові `grant`, хелпери `private`, політики. Про порядок сказати: тут `update` іде до `drop constraint`, бо в цьому демо міграції застосовуються разом, до `users:demo`, і профілів ще немає; у проєкті, де користувачі з `member` уже є, старий constraint знімають першим — зразок у заголовку `20261012000000_profiles_and_roles.sql` на `main` і в `AGENTS.md` | файл на екрані без змін; на питання «чи це працює» — на `main` це перевіряє `tests/db/leave-db.test.ts` (PGlite, розділ 3), а в CI — `db-check` (`supabase db start`) | файл на GitHub; в основній теці на `main`: `npx vitest run tests/db` |
| 3 (якщо є час) | `npx vitest run -t "AC-LEAVE-0"` | 15 тестів з AC ID у назвах, решта skipped — усі зелені | `npm test` |
| 4 (якщо є час) | `npm run ac:coverage` | `AC у специфікаціях: 9 … «реалізовано»: 9 … OK` | `docs/conformance.md` на тезі `demo-03-impl` |
| 5 (якщо є час) | `npm run build` | рядок `ƒ Proxy (Middleware)` | збірка довша за 1 хв — показати лог збірки на Vercel (Deployments → Build Logs) |
| 6а | Браузер, репо команди (слайд 33): Settings → **Collaborators**; Settings → **Rules** → ruleset `main` (обов'язкові `spec`, `app`, `conformance`, `db-check`; approve не вимагається — сказати «у команді 1 approve і CODEOWNERS», `team-main.json` домашки); файл **`.github/CODEOWNERS`** (чотири шляхи → `@koldovsky`); Settings → **Environments → production** (лише назва секрету `SUPABASE_DB_URL`, Deployment branches = `main`) | сторінки як у розділі 1.1; значень секретів на екрані немає | знімки з репетиції (1.5); якщо environment не створено (крок 1.1.5 пропущено) — `docs/bootstrap.md`, крок 3 і `ci.yml` (job `db-deploy`) на GitHub |
| 6б | Actions → останній прогін CI на `main` → job **`db-deploy`** → кроки «Dry run» і «Apply migrations»; потім Supabase → Database → **Migrations** | з секретом — застосовувати нічого (база актуальна; текст — з прогону 1.1.5); без секрету — повідомлення «Секрет SUPABASE_DB_URL … не задано»; у Dashboard — шість міграцій (розділ 1.2.3). Сказати: міграцію пише розробник у PR, перевіряє `db-check`, застосовує `db-deploy`; **ніколи** `db push` з ноутбука | знімки лога й Dashboard з репетиції (1.5); проєкт на паузі — сказати про Restore (відновлює лише Owner — PM) |
| 7 | Vercel → Project → Environment Variables (лише назви), Deployment Protection вимкнено (слайд 34) | — | скрін |
| 8 | GitHub: PR #6 `demo/first-pr` (крок 1.4) — зелені `spec`, `app`, `conformance`, `db-check`, рядок AC-LEAVE-01 у матриці, preview від Vercel. Сказати: у команді перший PR кожного — рядок у `docs/team.md` (тип «Онбординг»), тести з AC ID — у PR-ах задач після тегу spec-v0.1; далі approve колеги (і Code Owners, якщо зачеплено їхні шляхи) → squash-merge → прод-деплой | чотири зелені перевірки; коментар Vercel з preview-URL, preview відкривається без входу у Vercel | скрін PR з репетиції (1.5); PR не оновлено з `main` (у списку `conformance` skipped і немає `db-check`) — сказати «у репо вашої команди `conformance` і `db-check` біжать на кожному PR, і всі чотири мають бути зелені» |
| 9 (якщо є час) | Прод-URL: `teacher@` → «Подати заявку», відпустка 10.11–11.11.2026, обидві посади | «Заявку подано»; у «Мої заявки» — два записи «на розгляді» | в основній теці на `main` (лише там є `.env.local`): `npm run dev` → http://localhost:3000 |
| 10 (якщо є час) | `manager.math@` → «Черга рішень»: лише запис основної посади → «Схвалити» | «Рішення збережено: схвалено» | вхід не працює — перевірити Site URL/Redirect URLs (крок 1.2.6); інакше `npm run dev` в основній теці на `main` |
| 11 (якщо є час) | `manager.primary@` → «Повернути на доопрацювання» з порожнім коментарем, потім з «Уточніть дату кінця» | спершу «Щоб повернути заявку на доопрацювання, напишіть коментар.» (код `COMMENT_REQUIRED` у `?error=` адреси), потім «на доопрацюванні» | `npx vitest run -t "AC-LEAVE-07"` |
| 12 (якщо є час) | `teacher@` → «Виправити й подати знову» (кінець 12.11) | обидва записи знову «на розгляді» | `npx vitest run -t "AC-LEAVE-08"` |

На прод-URL уже стан `main` (spec-v0.2): у формі є поле «Заміна». Це нормально — скажіть, що воно з'явиться в демо 4.
Заявки з репетиції мають бути видалені заздалегідь (крок 1.5, останній пункт; чекліст 1.6) — інакше крок 9 покаже
«На ці дати у вас уже є заявка на розгляді або схвалена.». Почати з чистої бази посеред заняття:
Dashboard → SQL Editor → `delete from public.leave_requests;` (записи видаляться каскадом).

### Демо 4 — Спека живе далі в тому ж репо (блок 5) — `spec-v0.2~1` → `spec-v0.2` → `demo-04-sync`

Сюжет (слайди 37–38): PM випускає spec-v0.2 у репо команди → у PR PM `conformance` червоний, доки немає рядків для
нових AC → додали рядки «відкладено (новий AC — чекає задачі)» → зелений → merge і тег → нові й змінені AC стають
задачами (issues «Задача») → PR-и задач переводять рядки в «реалізовано» (тег `demo-04-sync`). У демо-історії
проміжного стану з «відкладено» для AC-LEAVE-10 і 11 немає (їх реалізовано одразу), тому його відтворюємо локально
(крок 5, «якщо є час») або показуємо на слайді 38.

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | `git switch --detach spec-v0.2~1` (тека `lp-spec-v0.2`) → `openspec/changes/clarify-leave-rules/` | MODIFIED 3 вимоги, ADDED «Перетин заявок» | GitHub, коміт `Propose clarify-leave-rules…` |
| 2 | `npx openspec show clarify-leave-rules --diff` | `ADDED: Перетин заявок`, `MODIFIED: Подання заявки / Заблоковані дні / Маршрутизація` з `-`/`+` рядками | `docs/demo/spec-v0.2-diff.txt` |
| 3 | `npx openspec archive clarify-leave-rules -y`, потім скинути: `git restore . && git clean -fd openspec && git switch --detach spec-v0.2` | `+ 1 added, ~ 3 modified` | тег `spec-v0.2`, `product/CHANGELOG.md` |
| 4 | `npm run ac:coverage` на `spec-v0.2` (слайд 38). Сказати: у репо команди це job `conformance` у PR PM — він обов'язковий, тож PR не зіллється | `FAIL`: `NO-ROW … AC-LEAVE-10`, `AC-LEAVE-11`, exit 1 — те саме, що в `docs/demo/drift-ci.txt` | `docs/demo/drift-ci.txt` у теці `lp-demo-04-sync` (у `lp-spec-v0.2` цього файлу ще немає — він з'явився після тегу) |
| 5 (якщо є час, ~30 с) | Ще в `lp-spec-v0.2`: `git show main:docs/demo/spec-v0.2-new-ac-rows.md >> docs/conformance.md` → `npm run ac:coverage` → скинути: `git restore docs/conformance.md` | два рядки «відкладено (новий AC — чекає задачі)» → `рядків у матриці: 11, «реалізовано»: 9 … OK` | слайд 38 (рядок «відкладено» в терміналі слайда); файл `docs/demo/spec-v0.2-new-ac-rows.md` на GitHub |
| 6 | Що далі робить команда: техлід із командою — пункти `tasks.md` → issues форми **«Задача»** (Issues → New issue → «Задача»: AC ID, що зробити, Done when, область), мітка `task`; кожен бере свою → гілка `task/<N>-…` → PR «Closes #N». MODIFIED (01/02/04/05) скрипт не бачить — техлід бачить їх у рев'ю PR PM (`git diff spec-v0.1 spec-v0.2 -- openspec/specs`) і заводить задачі | — | файл `.github/ISSUE_TEMPLATE/task.yml` на GitHub; розділ «Перехід на spec-v0.2» журналу — команда під таблицею |
| 7 | `demo-04-sync`: `tests/leave/calendar.test.ts`, `docs/conformance.md` (spec-v0.2, 11 рядків) | рядки AC-LEAVE-10, 11 «реалізовано» | `git diff spec-v0.2 demo-04-sync -- docs/conformance.md` |
| 8 | `npm run ac:coverage` (тека `lp-demo-04-sync`) | `AC у специфікаціях: 11 … «реалізовано»: 11 … OK` | вивід із розділу 3 |
| 9 (якщо є час) | Прод-URL, `teacher2@`: заявка 05.11–05.11.2026 → помилка (AC-LEAVE-10); дві заявки, що перетинаються → помилка (AC-LEAVE-11) | тексти «лише заблоковані дні», «уже є заявка» | `npx vitest run -t "AC-LEAVE-1"` (3 тести) |
| 10 | Наголос: `/opsx:verify` і `/conformance` — порадники; ворота — детерміновані перевірки CI | — | слайд деки замість живого запуску `/opsx:verify` |

План Б кроку 6 — розділ «Перехід на spec-v0.2» журналу розробника (з будь-якої теки, лише читає з git):

```bash
git show main:docs/spec-reading/koldovsky.md | sed -n '/^## Перехід на spec-v0.2/,/^## Що пропустив/p'
```

Крок 5 читає файл із гілки `main` (`git show main:…`), тож працює в будь-якій теці `lp-*` без зміни тегу; після
`git restore` тека знову точно на `spec-v0.2`. Перевірено 13.10.2026 у тимчасовому worktree на `spec-v0.2`: FAIL з
NO-ROW ×2 → після двох рядків `OK` (11 рядків, «реалізовано»: 9).

### Після заняття — репо команд (на сцені не робимо)

PM кожної команди створює репо команди одразу після заняття (walkthrough-pm домашки, крок 1): у браузері
<https://github.com/koldovsky/2026-quitcode-06-project-template> → **Use this template** → свій особистий акаунт,
**Public** (від першого push і назавжди), назва — `<team-slug>`; або
`gh repo create <team-slug> --public --template koldovsky/2026-quitcode-06-project-template --clone`.
Посилання на репо — у чат команди. Наступного дня викладач відкриває кожне: репо створено з шаблону і має
`product/`, `openspec/`, `.github/CODEOWNERS` (перевірка: `gh repo view <owner>/<team-slug> --json templateRepository`
→ шаблон курсу). Кнопки «Use this template» немає чи `gh` падає — шаблон не позначено як Template repository
(чекліст 1.6): `gh repo edit … --template` і повторити. Далі PM іде чеклістом `docs/bootstrap.md` шаблону.

## 3. Очікувані результати воріт на кожному тезі

Перевірено локально 09.10.2026, рядок `main` — 13.10.2026 (Node 24.18, npm 11.16): `lint`, `typecheck`, `build` (з `ƒ Proxy (Middleware)`),
`spec:check` — зелені на всіх тегах.

| Тег | `npm test` | `spec:validate` | `spec:check` | `ac:coverage` |
|---|---|---|---|---|
| `demo-01-template` | 25 тестів | `No items found to validate.` | 0 сценаріїв, denylist 3 → OK | OK (порожній шаблон) |
| `spec-v0.1` | 25 | `✓ spec/leave-requests` | 9 AC → OK | **FAIL: NO-ROW ×9 — очікувано** (історичний стан тегу; у репо команди PM додає рядки «відкладено» в тому ж PR) |
| `demo-02-clarify` | 25 | ✓ | OK | OK: 9 рядків, «реалізовано»: 0 |
| `demo-03-impl` | 48 | ✓ | OK | OK: 9/9 «реалізовано» |
| `spec-v0.2` | 48 | ✓ | 11 AC → OK | **FAIL: NO-ROW AC-LEAVE-10, AC-LEAVE-11 — очікувано** (дрейф; з рядками з `docs/demo/spec-v0.2-new-ac-rows.md` — OK, демо 4, крок 5) |
| `demo-04-sync` | 55 | ✓ | OK | OK: 11/11 «реалізовано» |
| `main` (після тегів: зміни `harden-leave-db`, `harden-manager-reads`, `harden-leave-rules-db`; модель одного репо) | 74: 26 — тести застосунку (`tests/leave/`), 12 — тести бази `tests/db/leave-db.test.ts`, 36 — тести скриптів перевірок (з них 11 — `check-migration-order`) | ✓ | OK | OK: 11/11 «реалізовано»; AC-LEAVE-05, 09 — лише через тести бази |

На `main` ще `MIGRATION_BASE=origin/main node scripts/check-migration-order.mjs` → `migration-order — OK: нових міграцій 0;
застосовані міграції не змінено.` (13.10.2026). `db-check` (`supabase db start`) локально не запускали — Docker на машині
автора не потрібен; перший прогін — у CI PR перебудови (крок 1.1.1).

Схему й політики перевірено на PGlite з емульованими ролями Supabase (`anon`, `authenticated`,
`service_role`, `auth.uid()`): видимість за ролями, черги за підрозділом, заборона самосхвалення й
самопідвищення ролі, обов'язковий коментар, повторне подання. На `main` це автоматичний тест у `npm test` і CI —
`tests/db/leave-db.test.ts` (усі 6 міграцій + сид; зміни `harden-leave-db`, `harden-manager-reads` і `harden-leave-rules-db`); він же перевіряє, що заявку без
записів база відхиляє (`REQUEST_WITHOUT_RECORDS`). На тегах `demo-*` тестів бази ще немає, а заявку без записів
там можна вставити напряму через Data API — саме це й закриває `harden-leave-db`. На справжньому проєкті
Supabase — перевірено на репетиції 11.10.2026 (розділ 1.5, «RLS на справжньому Postgres»).

## 4. Після заняття

- Закрити або злити PR #6 `demo/first-pr`; issues #1–#5 закрито з відповідями.
- `git worktree remove ../lp-<тег>` для кожної теки.
- Supabase-проєкт можна поставити на паузу в налаштуваннях проєкту (Pause project; шлях у Dashboard перевіряємо на репетиції), якщо слот потрібен.
