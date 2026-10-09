# RUNBOOK: демо «портал відсутностей» на WS6

Сценарій для ведучого: що показати на кожному тезі, які команди запустити, що має вийти і що робити,
якщо не вийшло (План Б). Окремо — кроки з акаунтами, які треба зробити **до заняття**.

Репозиторій грає обидві ролі в одній історії: PM (upstream — `product/`, `openspec/`, теги `spec-vX.Y`)
і розробника (код, міграції, тести, `docs/`). У справжній команді розробник працює у **форку** —
тут усе в одній гілці `main`, щоб на сцені було видно весь шлях по тегах.

| Тег | Роль | Що в ньому | Блок деки |
|---|---|---|---|
| `demo-01-template` | PM | шаблон + `product/` (vision, glossary, roles з матрицею, roadmap WS7–WS11, denylist) | 2, 4 |
| `spec-v0.1` | PM | зміна `add-leave-request` заархівована → `openspec/specs/leave-requests/spec.md`, CHANGELOG | 2 (демо 1) |
| `demo-02-clarify` | dev + PM | `docs/spec-reading.md` (Q1–Q5), `docs/demo/issues/Q1…Q5.md`, відповіді в `product/decisions.md`, рядки матриці «відкладено» | 3 (демо 2) |
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
   у Claude Code викликають **глобальний** `openspec`; на цій машині він був 1.13.0 — оновіть:
   `npm i -g @fission-ai/openspec@1.14.1` → `openspec --version` = `1.14.1`. Телеметрія: `OPENSPEC_TELEMETRY=0`.
3. Окрема тека на кожен тег, щоб не перемикати гілки на сцені й не загубити цей файл (він є лише на `main`):

   ```bash
   cd D:/projects/clients/quitcode/2026-quitcode-06-leave-portal-demo
   for t in demo-01-template spec-v0.1 demo-02-clarify demo-03-impl spec-v0.2 demo-04-sync; do
     git worktree add --detach "../lp-$t" "$t"
     (cd "../lp-$t" && npm ci --no-audit --no-fund)
   done
   ```

   Для проміжних станів — у потрібній теці `git switch --detach spec-v0.1~1` (і назад `git switch --detach spec-v0.1`).
   Без worktree: `git switch --detach <тег>` в основній теці (`node_modules` той самий — `package.json` між тегами не змінюється).
4. У кожній теці прогнати ворота й звірити з таблицею «Очікувані результати» (розділ 3):
   `npm run lint && npm run typecheck && npm test && npm run build && npm run spec:validate && npm run spec:check && npm run ac:coverage`.
5. Локальний denylist справжніх назв (для показу в блоці 2): створіть `product/denylist.local.txt`
   (він у `.gitignore`) і впишіть туди назви клієнта, школи й людей — по одній у рядку.
   `npm run spec:check` має лишитись **OK**, а знайдені збіги друкуються як «слово #N із product/denylist.local.txt»,
   без значень. Цей файл не комітимо й не показуємо на екрані.

## 1. Акаунти — зробити до заняття (автор, своїми руками)

Нічого з цього не робиться автоматично й не входить у репозиторій. Значень секретів ніде не записуємо.

### 1.1 GitHub

1. Порожній публічний репозиторій і push історії з тегами:

   ```bash
   gh repo create koldovsky/2026-quitcode-06-leave-portal-demo --public
   git remote add origin https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo.git
   git push -u origin main --tags
   ```

   Перший push у `main` запускає CI: `spec` і `app` — зелені; `conformance` і `db` — пропущені (це не форк).
2. Мітка й п'ять питань (створювати **до** будь-якого PR — тоді номери будуть #1…#5, як у
   `docs/spec-reading.md` і `product/decisions.md`; якщо номери інші — виправте їх в обох файлах):

   ```bash
   R=koldovsky/2026-quitcode-06-leave-portal-demo
   gh label create spec-question --repo $R --description "Питання до специфікації"
   for i in 1 2 3 4 5; do
     f=docs/demo/issues/Q$i.md
     t=$(sed -n '1s/^<!-- title: \(.*\) -->$/\1/p' "$f")
     gh issue create --repo $R --title "$t" --label spec-question --body-file "$f"
   done
   ```

   Відповіді PM (колонка «Відповідь» з `product/decisions.md`) — коментарем у кожному issue, потім закрити:
   `gh issue comment <N> --repo $R --body "…"` → `gh issue close <N> --repo $R`.
3. Ruleset — **після** push (інакше push у `main` заблокує): Settings → Rules → Rulesets → New branch ruleset →
   Target: default branch → Require a pull request before merging + Require status checks to pass: `spec`, `app` → Active.

### 1.2 Supabase (власна організація, не через Vercel Marketplace)

1. Створити проєкт (вільний слот: на Free — 2 активні проєкти на акаунт). Зберегти пароль БД у менеджері паролів.
2. Authentication → Sign In / Providers → Email → вимкнути **Confirm email**
   (вбудований SMTP — 2 листи/год і лише членам команди; користувачів створює скрипт).
3. Прив'язати й застосувати міграції та сид:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>          # спитає пароль БД
   npx supabase db push --dry-run --include-seed  # має показати 3 міграції і seed.sql
   npx supabase db push --include-seed            # 20261012…, 20261013…, 20261016… + підрозділи й 05.11.2026
   ```

   Точний текст виводу CLI 2.120 перевіряємо на репетиції. Повторний `db push --dry-run` має сказати,
   що віддалена база актуальна.
4. `.env.local` за зразком `.env.example` (Project Settings → API Keys): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DEMO_USER_PASSWORD` (≥ 8 символів, свій). Потім:

   ```bash
   npm run users:demo
   ```

   Очікувано (п'ять рядків, пароль не друкується):

   ```text
   ✔ admin@example.test — створено, роль admin
   ✔ manager.math@example.test — створено, роль manager (менеджер MATH)
   ✔ manager.primary@example.test — створено, роль manager (менеджер PRIMARY)
   ✔ teacher@example.test — створено, роль employee (main MATH, additional PRIMARY)
   ✔ teacher2@example.test — створено, роль employee (main PRIMARY)
   ```

   «підрозділу MATH немає» → не застосовано сид: `npx supabase db push --include-seed`.
5. (Необов'язково) `npm run db:types` перегенерує `src/lib/supabase/database.types.ts`; після нього —
   `npm run typecheck`. Якщо впав — `git restore src/lib/supabase/database.types.ts` (рукописні типи робочі).
6. Authentication → URL Configuration (після кроку Vercel): Site URL = прод-URL Vercel; Redirect URLs:
   `http://localhost:3000/**` і `https://*-<slug-акаунта-vercel>.vercel.app/**`.
7. Free-проєкт засинає після ~7 днів без активності: за день до заняття відкрийте Dashboard і застосунок.

### 1.3 Vercel (Hobby)

1. Add New → Project → Import `koldovsky/2026-quitcode-06-leave-portal-demo` (Node 24.x береться з `engines`).
2. Environment Variables для **Production і Preview**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SECRET_KEY` застосунку цього зрізу не потрібен (лише
   скрипту `users:demo` локально) — у Vercel його не додаємо. Не через Marketplace-інтеграцію Supabase.
3. Settings → Deployment Protection → **Vercel Authentication** — вимкнути (PM відкриває preview без входу).
4. Deployments → Redeploy (змінні діють лише для нових деплоїв). Відкрити прод-URL → `/login`.
5. Повернутись до кроку 1.2.6 (Site URL і Redirect URLs).

### 1.4 Перший PR для демо 3 (за кілька годин до заняття — CI і preview потребують часу)

```bash
git switch -c demo/first-pr main
```

Додати в `tests/leave/submission.test.ts` у `describe("Подання заявки")`:

```ts
  it("AC-LEAVE-01: дата початку в минулому дозволена (хворобу оформлюють після повернення)", () => {
    const result = validateSubmission(
      { leaveType: "sick", startDate: "2026-09-01", endDate: "2026-09-02", positionIds: ["pos-single-main"] },
      singlePosition,
    );
    expect(result.ok).toBe(true);
  });
```

```bash
npm test && git commit -am "Cover past start dates for AC-LEAVE-01" && git push -u origin demo/first-pr
gh pr create --repo koldovsky/2026-quitcode-06-leave-portal-demo --base main --fill
```

Очікувано: у PR зелені `spec` і `app`, коментар Vercel з preview-URL; `conformance` — skipped (не форк).
Після заняття PR можна злити (рядок AC-LEAVE-01 у матриці вже є) або закрити.

### 1.5 Репетиція (обов'язково)

- Пройти розділ 2 повністю на прод-URL, з трьома вікнами браузера (звичайне, інкогніто, інший браузер)
  для `teacher@`, `manager.math@`, `manager.primary@`.
- **RLS вручну (AC-LEAVE-09):** `teacher2@` не бачить заявок `teacher@`; `manager.math@` бачить лише записи
  `main` посад «Математики»; `admin@` бачить усе на `/manage`, але без кнопок рішення.
- Якщо форк для «CI червоний» потрібен наживо (демо 4): форк у другий акаунт або організацію (свій репозиторій
  у той самий акаунт GitHub не форкнеться) — перевіряємо на репетиції; інакше — локальний `ac:coverage` (розділ 2, демо 4).

## 2. Сценарій на сцені

Скрізь: шрифт термінала ≥ 18 pt, `OPENSPEC_TELEMETRY=0`, вкладки браузера відкриті заздалегідь.

### Демо 1 — PM: спека, з якою працюють і людина, і агент (блок 2) — `demo-01-template` → `spec-v0.1`

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | Тека `lp-demo-01-template`: `product/vision.md`, `glossary.md`, `roles.md` (матриця роль × сутність × дія), `roadmap.md` | зріз на кожне заняття WS6–WS11 | файли на GitHub на тезі `demo-01-template` |
| 2 | `product/denylist.txt` + пояснити `denylist.local.txt` і секрет `SPEC_DENYLIST`; `npm run spec:check` | `слів у denylist: 3` (+ локальні) → `OK` | показати рядок `## 4. Denylist` у `scripts/check-spec.mjs` і тест `reads words from the local product/denylist.local.txt` (`npx vitest run tests/scripts/check-spec.test.ts`) |
| 3 | (наживо, необов'язково) Claude Code: `/opsx:propose Працівник подає заявку на відсутність на одну або дві посади, менеджер підрозділу схвалює або повертає з коментарем` — агент ставить PM питання, пише `proposal.md` і дельту | зміна з `### Requirement:` і `#### Scenario: AC-LEAVE-…` | не чекати агента: `git switch --detach spec-v0.1~1` і показати готову зміну |
| 3а | Після живого `/opsx:propose` скинути теку: `git restore . && git clean -fd openspec docs` | `git status` порожній | перестворити теку: `git worktree remove --force ../lp-<тег>` і `git worktree add --detach ../lp-<тег> <тег>` |
| 4 | `git switch --detach spec-v0.1~1` → `openspec/changes/add-leave-request/proposal.md` (Users & roles, Non-goals, Assumptions, Open questions Q4–Q5) і `specs/leave-requests/spec.md` | 5 вимог, AC-LEAVE-01…09 | GitHub, коміт `Propose add-leave-request…` |
| 5 | `npx openspec validate add-leave-request --strict` | `Change 'add-leave-request' is valid` | скрін з репетиції |
| 6 | `npm run spec:check` | `сценаріїв: 9 … OK` | вивід з таблиці розділу 3 (рядок `spec-v0.1`) |
| 7 | `npx openspec archive add-leave-request -y` | `+ 5 added`, `archived as '<дата>-add-leave-request'` | показати тег `spec-v0.1` |
| 8 | Скинути: `git restore . && git clean -fd openspec && git switch --detach spec-v0.1`; показати `openspec/specs/leave-requests/spec.md` і `product/CHANGELOG.md` | канонічна спека з `## Purpose` українською | відкрити ці файли на GitHub на тезі `spec-v0.1` |

Наголос: `validate --strict` перевіряє структуру, а не зміст — AC-LEAVE-02 і AC-LEAVE-04 проходять, хоча неоднозначні.

### Демо 2 — Dev: прочитати, уточнити, розбити (блок 3) — `spec-v0.1` → `demo-02-clarify`

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | Тека `lp-spec-v0.1`, Claude Code: «Уточни спеку spec-v0.1 скілом spec-clarify» | таблиця 11 категорій, потім по одному питанню з варіантами й рекомендацією | агент не відповідає за 2 хв — перервати й перейти до кроку 2 через План Б (`demo-02-clarify~2`) |
| 2 | Пройти 2–3 питання наживо (Q1, Q2, Q3) | Q1: «покриває обидві посади»; Q2: заблокований день — прийняти чи відхилити; Q3: дві черги | `git switch --detach demo-02-clarify~2` → `docs/spec-reading.md` (стан «очікуємо») |
| 2а | Після живого прогону скіла скинути теку: `git restore . && git clean -fd openspec docs` (скіл пише в `docs/spec-reading.md`) | `git status` порожній | перестворити теку: `git worktree remove --force ../lp-<тег>` і `git worktree add --detach ../lp-<тег> <тег>` |
| 3 | `docs/demo/issues/Q2.md` → на GitHub відкрити issue #2 (створене заздалегідь, крок 1.1.2) | поля форми `spec-question` | файл `Q2.md` на екрані |
| 4 | `product/decisions.md` на `demo-02-clarify` | Q1–Q5 з відповідями й «spec-v0.2 (готується)» | закриті issues #1–#5 з коментарями PM на GitHub |
| 5 | `docs/spec-reading.md` на `demo-02-clarify`: «Відповідь PM», «Власні припущення»; варіанти A–D кожного питання — у `docs/demo/issues/Q*.md` | колонки «Відповідь PM» і «Рішення» заповнені | `git diff demo-02-clarify~2 demo-02-clarify -- docs/spec-reading.md` |
| 6 | `npm run ac:coverage` на `spec-v0.1`, потім на `demo-02-clarify` | спершу `FAIL … NO-ROW (9)`, потім `OK`: 9 рядків «відкладено (…)» | вивід у таблиці розділу 3 |

Скіл не детермінований: формулювання будуть інші, але п'ять неоднозначностей мають знайтись; якщо агент
пропустив Q2 — показати, як категорія «Сигнали завершеності» її ловить (THEN без результату).

### Демо 3 — Старт з нуля (блок 4) — `demo-03-impl`

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | `openspec/changes/archive/*-impl-leave-request/design.md` (таблиця прав) і `tasks.md` («Done when: AC-…») | `skip_specs: true` у `.openspec.yaml` | файли на GitHub на тезі `demo-03-impl` |
| 2 | `supabase/migrations/20261013000000_leave_requests.sql`: порядок зміни ролей, `revoke` + колонкові `grant`, хелпери `private`, політики | файл на екрані без змін; на питання «чи це працює» — розділ 3 (перевірка на PGlite) | файл на GitHub |
| 3 | `npx vitest run -t "AC-LEAVE-0"` | 15 тестів з AC ID у назвах, решта skipped — усі зелені | `npm test` |
| 4 | `npm run ac:coverage` | `AC у специфікаціях: 9 … «реалізовано»: 9 … OK` | `docs/conformance.md` на тезі `demo-03-impl` |
| 5 | `npm run build` | рядок `ƒ Proxy (Middleware)` | збірка довша за 1 хв — показати лог збірки на Vercel (Deployments → Build Logs) |
| 6 | `npx supabase db push --dry-run` | віддалена база актуальна (текст — з репетиції) | скрін Dashboard → Database → Migrations |
| 7 | Vercel → Project → Environment Variables (лише назви), Deployment Protection вимкнено | — | скрін |
| 8 | GitHub: PR `demo/first-pr` (крок 1.4) — зелені `spec`, `app`, preview від Vercel | `conformance` skipped: не форк | скрін PR |
| 9 | Прод-URL: `teacher@` → «Подати заявку», відпустка 10.11–11.11.2026, обидві посади | «Заявку подано»; у «Мої заявки» — два записи «на розгляді» | локально `npm run dev` з `.env.local` |
| 10 | `manager.math@` → «Черга рішень»: лише запис основної посади → «Схвалити» | «Рішення збережено: схвалено» | вхід не працює — перевірити Site URL/Redirect URLs (крок 1.2.6); інакше локально `npm run dev` |
| 11 | `manager.primary@` → «Повернути на доопрацювання» з порожнім коментарем, потім з «Уточніть дату кінця» | спершу «Щоб повернути заявку на доопрацювання, напишіть коментар.» (код `COMMENT_REQUIRED` у `?error=` адреси), потім «на доопрацюванні» | `npx vitest run -t "AC-LEAVE-07"` |
| 12 | `teacher@` → «Виправити й подати знову» (кінець 12.11) | обидва записи знову «на розгляді» | `npx vitest run -t "AC-LEAVE-08"` |

На прод-URL уже стан `main` (spec-v0.2): у формі є поле «Заміна». Це нормально — скажіть, що воно з'явиться в демо 4.
Якщо треба почати з чистої бази: Dashboard → Table Editor — видаліть рядки `leave_requests` (записи видаляться каскадом).

### Демо 4 — Спека живе далі (блок 5) — `spec-v0.2~1` → `spec-v0.2` → `demo-04-sync`

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | `git switch --detach spec-v0.2~1` (тека `lp-spec-v0.2`) → `openspec/changes/clarify-leave-rules/` | MODIFIED 3 вимоги, ADDED «Перетин заявок» | GitHub, коміт `Propose clarify-leave-rules…` |
| 2 | `npx openspec show clarify-leave-rules --diff` | `ADDED: Перетин заявок`, `MODIFIED: Подання заявки / Заблоковані дні / Маршрутизація` з `-`/`+` рядками | `docs/demo/spec-v0.2-diff.txt` |
| 3 | `npx openspec archive clarify-leave-rules -y`, потім скинути: `git restore . && git clean -fd openspec && git switch --detach spec-v0.2` | `+ 1 added, ~ 3 modified` | тег `spec-v0.2`, `product/CHANGELOG.md` |
| 4 | `npm run ac:coverage` на `spec-v0.2` | `FAIL`: `NO-ROW … AC-LEAVE-10`, `AC-LEAVE-11`, exit 1 — те саме, що в `docs/demo/drift-ci.txt` | показати `drift-ci.txt` |
| 5 | Пояснити: у форку це job `conformance` у PR `sync/spec-v0.2` → CI червоний; MODIFIED (01/02/04/05) перевірка не бачить — їх звіряє людина за diff | — | таблиця «Синхронізація на spec-v0.2» у `docs/spec-reading.md` |
| 6 | `demo-04-sync`: `tests/leave/calendar.test.ts`, `docs/conformance.md` (spec-v0.2, 11 рядків) | рядки AC-LEAVE-10, 11 «реалізовано» | `git diff spec-v0.2 demo-04-sync -- docs/conformance.md` |
| 7 | `npm run ac:coverage` | `AC у специфікаціях: 11 … «реалізовано»: 11 … OK` | вивід із розділу 3 |
| 8 | Прод-URL, `teacher2@`: заявка 05.11–05.11.2026 → помилка (AC-LEAVE-10); дві заявки, що перетинаються → помилка (AC-LEAVE-11) | тексти «лише заблоковані дні», «уже є заявка» | `npx vitest run -t "AC-LEAVE-1"` (3 тести) |
| 9 | Наголос: `/opsx:verify` і `/conformance` — порадники; ворота — детерміновані перевірки CI | — | слайд деки замість живого запуску `/opsx:verify` |

## 3. Очікувані результати воріт на кожному тезі

Перевірено локально 09.10.2026 (Node 24.18, npm 11.16): `lint`, `typecheck`, `build` (з `ƒ Proxy (Middleware)`),
`spec:check` — зелені на всіх тегах.

| Тег | `npm test` | `spec:validate` | `spec:check` | `ac:coverage` |
|---|---|---|---|---|
| `demo-01-template` | 25 тестів | `No items found to validate.` | 0 сценаріїв, denylist 3 → OK | OK (порожній шаблон) |
| `spec-v0.1` | 25 | `✓ spec/leave-requests` | 9 AC → OK | **FAIL: NO-ROW ×9 — очікувано** (upstream PM; у форку це рядки «відкладено») |
| `demo-02-clarify` | 25 | ✓ | OK | OK: 9 рядків, «реалізовано»: 0 |
| `demo-03-impl` | 48 | ✓ | OK | OK: 9/9 «реалізовано» |
| `spec-v0.2` | 48 | ✓ | 11 AC → OK | **FAIL: NO-ROW AC-LEAVE-10, AC-LEAVE-11 — очікувано** (дрейф) |
| `demo-04-sync` | 55 | ✓ | OK | OK: 11/11 «реалізовано» |

Схему й політики (обидві міграції + сид двічі) перевірено на PGlite з емульованими ролями Supabase
(`anon`, `authenticated`, `service_role`, `auth.uid()`): видимість за ролями, черги за підрозділом,
заборона самосхвалення й самопідвищення ролі, обов'язковий коментар, повторне подання. На справжньому
проєкті Supabase — перевіряємо на репетиції (крок 1.5).

## 4. Після заняття

- Закрити або злити PR `demo/first-pr`; issues #1–#5 закрито з відповідями.
- `git worktree remove ../lp-<тег>` для кожної теки.
- Supabase-проєкт можна поставити на паузу в налаштуваннях проєкту (Pause project; шлях у Dashboard перевіряємо на репетиції), якщо слот потрібен.
