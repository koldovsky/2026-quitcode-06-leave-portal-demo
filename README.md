# Демо WS6: портал відсутностей персоналу школи

Демо-проєкт заняття «Специфікації на практиці: старт командного проєкту» курсу QuitCode.
Створено з шаблону `koldovsky/2026-quitcode-06-project-template` і проведено через увесь цикл:
продукт PM → специфікація spec-v0.1 → питання розробника → реалізація → spec-v0.2 → синхронізація.
Дані синтетичні, назви анонімізовано. Обидві ролі (PM і розробник) — в одній історії; кожен етап позначено тегом:

| Тег | Що показує |
|---|---|
| `demo-01-template` | шаблон + `product/` PM (бачення, глосарій, ролі й матриця прав, дорожня карта, denylist) |
| `spec-v0.1` | перша версія специфікації `openspec/specs/leave-requests/spec.md` (AC-LEAVE-01…09) |
| `demo-02-clarify` | питання розробника Q1–Q5 (`docs/spec-reading.md`, `docs/demo/issues/`) і відповіді PM (`product/decisions.md`) |
| `demo-03-impl` | реалізація зрізу: міграція з RLS, `src/lib/leave`, сторінки, тести з AC ID, `docs/conformance.md` |
| `spec-v0.2` | уточнена специфікація: MODIFIED AC-LEAVE-01/02/04/05, нові AC-LEAVE-10, 11 |
| `demo-04-sync` | дрейф (`docs/demo/drift-ci.txt`) і синхронізація реалізації зі spec-v0.2 |

Сценарій для ведучого й кроки з акаунтами (Supabase, Vercel, GitHub) — [docs/demo/RUNBOOK.md](docs/demo/RUNBOOK.md).

---

## Шаблон командного проєкту: Next.js + Supabase + OpenSpec

Стартовий репозиторій для вебзастосунку «з нуля»: агенція бере його для нового клієнтського проєкту,
а в курсі — кожна команда (PM + розробники) для свого навчального продукту.

- **Застосунок:** Next.js 16 (App Router, `src/`), вхід email + пароль через Supabase Auth, сторінка
  з email і роллю користувача з таблиці `profiles`; сесію оновлює `src/proxy.ts`.
- **База як код:** `supabase/migrations/` (профілі й ролі з RLS і явними GRANT), ідемпотентний `seed.sql`,
  синтетичні користувачі (`npm run users:demo`).
- **Специфікація:** OpenSpec (`openspec/`) з правилами формату в `openspec/config.yaml`; продуктовий
  контекст PM — `product/`; AC ID наскрізно: спека → назва тесту → `docs/conformance.md`.
- **Агенти:** `AGENTS.md` (+ `CLAUDE.md` = `@AGENTS.md`), команди `/opsx:*` і `/conformance`, скіли
  `spec-clarify` (розробник) і `spec-review` (PM) — однаково в Claude Code і Cursor; `.mcp.json` (Supabase MCP
  лише на читання) і `.claude/settings.json` (заборона читати `.env*` і запускати деструктивні команди Supabase CLI)
  діють лише в Claude Code — Cursor цих файлів не читає (див. AGENTS.md, «Секрети»).
- **Ворота:** GitHub Actions (`spec`, `app`; `conformance` і `db` — у форках або зі змінною `APP_REPO=true`,
  `db` — лише із секретами),
  шаблон PR, форма issue «Питання до специфікації», `.coderabbit.yaml`.

| Шар курсу | Де в шаблоні |
|---|---|
| Правила й команди | `AGENTS.md`, `CLAUDE.md`, `.claude/commands/`, `.cursor/commands/` |
| Скіли | `.claude/skills/` (Cursor читає цю ж теку) |
| MCP з мінімальними правами | `.mcp.json`, `.claude/settings.json` (лише Claude Code) |
| Специфікації | `product/`, `openspec/`, `scripts/check-*.mjs`, `docs/conformance.md` |

## Модель репозиторіїв

```text
шаблон koldovsky/2026-quitcode-06-project-template
  └─ «Use this template» → upstream PM  <pm>/<team-repo>     ← product/, openspec/ (лише PM), теги spec-vX.Y
        ├─ fork → <dev1>/<team-repo>  ← код, міграції, тести; свій Supabase і Vercel
        └─ fork → <dev2>/<team-repo>  …
```

Розробник змінює специфікацію лише PR-ом в upstream або питанням (issue `spec-question`).
Нову версію спеки забирає у форк гілкою `sync/spec-vX.Y`.

**Звичайний клієнтський проєкт (один репозиторій).** Код і спека живуть разом, форків немає: задайте змінну репозиторію `APP_REPO=true` — тоді CI запускає `conformance` (покриття AC) і `db` у цьому репозиторії; `.spec-source` не заповнюйте (крок `spec:source` пропускається з попередженням). Поведінку змінної в умові job звіряємо на репетиції.

## Перед початком (PM і розробники)

- Node 24 (`node -v`), Git, GitHub CLI (`gh`).
- OpenSpec CLI **глобально** й тієї ж версії, що в `package.json`:
  `npm i -g @fission-ai/openspec@1.14.1` → `openspec --version` має показати `1.14.1`
  (стара глобальна версія — оновіть тією ж командою). Команди `/opsx:*` і скіли `openspec-*` викликають
  просто `openspec`, а в PATH оболонки агента немає `node_modules/.bin`. Скрипти `npm run spec:*` і CI
  беруть версію з devDependencies. Телеметрію вимикає `openspec config set telemetry.enabled false`.

## Шлях PM

1. **Upstream.** На сторінці шаблону — **Use this template → Create a new repository**, власник — ваш акаунт,
   назва — слаг команди, **Public**. Settings → Rules → Rulesets: для `main` — Require a pull request (Allowed merge methods — лише Merge),
   Require status checks (`spec`, `app`). Settings → Collaborators → Add people: викладач і заступник із розробників
   (на особистому репозиторії вони отримують доступ на запис).
2. **Продукт.** У гілці `product/context` (прямі коміти в `main` ruleset відхиляє) заповніть `product/vision.md`, `glossary.md`, `roles.md` (матриця прав), `roadmap.md` → `npm run spec:check` → PR → merge.
   Справжні назви клієнта — не в файли репозиторію, а в локальний `product/denylist.local.txt` (у `.gitignore`;
   `npm run spec:check` читає його, але значень не друкує) і в секрет `SPEC_DENYLIST` (Settings → Secrets and
   variables → Actions) для CI. Але CI у PR із форків (пропозиції розробників) секретів не отримує: там `spec:check`
   бачить лише `product/denylist.txt`. Перед merge такого PR перевірте його локально: `gh pr checkout <номер>` →
   `npm run spec:check`. Якщо в такому PR замість перевірок `spec` і `app` GitHub показує кнопку **Approve and run workflows** (перший внесок розробника в ваш репозиторій), натисніть її — інакше обов'язкові перевірки чекатимуть безкінечно (точний текст кнопки й налаштування за замовчуванням звіряємо на репетиції).
   Створіть мітку для питань розробників (форма issue ставить лише наявну мітку):
   `gh label create spec-question --repo <pm>/<team-repo> --description "Питання до специфікації"`
   або в браузері: Issues → Labels → **New label** → `spec-question`.
3. **Перший зріз.** `npm ci`, `openspec --version` = `1.14.1` (див. «Перед початком»), потім у Claude Code
   `/opsx:propose <опис зрізу>` (у Cursor `/opsx-propose`) або вручну: `npx openspec new change add-<зріз>` → `proposal.md` + `specs/<capability>/spec.md`.
   Формат (вимоги EARS з SHALL, `#### Scenario: AC-<AREA>-<NN> …`) агент бере з `openspec/config.yaml`.
   `/opsx:propose` (у Cursor `/opsx-propose`) за своєю інструкцією генерує всі артефакти зміни, зокрема `design.md` і `tasks.md` (як реалізувати). У зміні PM їх не лишаємо — це робота розробника у форку: додайте до запиту «пиши лише proposal.md і specs/, без design.md і tasks.md», а якщо агент їх усе ж створив — видаліть обидва файли до коміту.
4. **Перевірка.** `npm run spec:validate`, `npm run spec:check`, скіл `spec-review`.
5. **Реліз.** Гілка зміни (`spec/add-<зріз>`) → PR → рев'ю команди → у тій самій гілці, **до merge**,
   `npx openspec archive add-<зріз> -y` і запис у `product/CHANGELOG.md` (ruleset не пускає прямі коміти в `main`) →
   merge кнопкою **Create a merge commit** → `git switch main && git pull` → `git tag spec-v0.1` →
   `git push origin spec-v0.1`. Або тег через браузер: Code → Releases → **Draft a new release** → Choose a tag →
   `spec-v0.1` → **Create new tag on publish** → Target — `main` → **Publish release** (точні назви кнопок звіряємо
   на репетиції).
6. **Питання розробників.** Відповідайте в issues `spec-question`; рішення — у `product/decisions.md`;
   якщо змінюється поведінка — нова зміна (MODIFIED/ADDED) і тег `spec-v0.2`.
7. **Оновлення шаблону.** Виправлення шаблону викладач оголошує в чаті курсу з SHA звичайного (не merge) коміту:
   виправлення шаблону комітимо напряму в main шаблону або зливаємо Squash, бо `git cherry-pick` merge-коміту
   без `-m 1` не працює. Не `git merge` шаблону: «Use this template» починає нову
   історію, і merge дає конфлікт у кожному файлі, що відрізняється. Натомість (один раз)
   `git remote add template https://github.com/koldovsky/2026-quitcode-06-project-template.git` → `git fetch template` →
   `git switch -c template/<коротко>` → `git cherry-pick <sha>` →
   `npm ci && npm run lint && npm run typecheck && npm test && npm run spec:check` →
   `git push -u origin template/<коротко>` → PR типу «Оновлення шаблону» →
   **Create a merge commit**. Розробники отримують виправлення з наступним тегом спеки (гілка `sync/spec-vX.Y`).

## Шлях розробника

1. **Форк** upstream PM у свій акаунт; Actions → увімкнути workflows; локально:
   `git clone https://github.com/<я>/<team-repo>.git` → `gh repo set-default <я>/<team-repo>`
   (інакше `gh pr create` цілить в upstream) → `git remote add upstream https://github.com/<pm>/<team-repo>.git`.
   Форк зроблено вже після тегу `spec-v0.1`? До ruleset вирівняйте `main` форку з останнім тегом PM: `git fetch upstream --tags` → `git reset --hard <останній тег>` → `git push --force-with-lease origin main`; крок 6 робіть одразу з цим тегом.
   Ruleset на `main` (PR + статуси `spec`, `app`, `conformance`; Allowed merge methods — лише Merge).
2. **Залежності:** Node 24 (`node -v`), `openspec --version` = `1.14.1` (див. «Перед початком»), `npm ci`,
   `npm run typecheck`, `npm test`.
3. **Supabase** (власна організація, не через Vercel Marketplace): створіть проєкт; в налаштуваннях
   Authentication вимкніть «Allow new users to sign up» (інакше будь-хто з публічним ключем із бандла
   зареєструється сам; локально те саме робить `[auth] enable_signup = false` у `supabase/config.toml`) і
   Confirm email для Email (точне місце перемикачів у Dashboard звіряємо на репетиції). Користувачів створює
   лише `npm run users:demo` (Admin API): з вимкненою реєстрацією він працює й у хмарі (за кодом GoTrue — так;
   звіряємо на репетиції). `npx supabase login` → `npx supabase link --project-ref <ref>` →
   `npx supabase db push --dry-run` → `npm run db:push` → `npm run db:types`.
   `.env.local` за зразком `.env.example` → `npm run users:demo` → `npm run dev` → вхід як `admin@example.test`.
4. **Vercel** (Hobby): Add New → Project → імпорт форку; для Production і Preview — лише дві змінні
   `NEXT_PUBLIC_SUPABASE_URL` і `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → редеплой. `SUPABASE_SECRET_KEY` у Vercel
   не додаємо: коду застосунку першого зрізу він не потрібен (найменші права), він живе лише в `.env.local`
   для `npm run users:demo`. Змінну типу Secret додайте тоді, коли її справді читає ваш серверний код.
   Supabase → Authentication → URL Configuration: Site URL = прод-URL, Redirect URLs `http://localhost:3000/**`
   і `https://*-<slug>.vercel.app/**`. Для навчальних проєктів вимкніть Vercel Authentication на preview.
5. **Секрети CI** (для job `db`): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`.
   За бажанням додайте у форку секрет `SPEC_DENYLIST` (значення — від PM в особистому повідомленні) або локальний
   `product/denylist.local.txt`: тоді `spec:check` ловить справжні назви й у ваших `docs/` і `supabase/`.
   **Перший PR у форку — `docs/bootstrap.md`** (докази бутстрапу, день 0–1, без значень секретів): CI зелений
   (`spec`, `app`, `conformance`), preview відкривається. Тестів з AC ID у назвах у ньому ще немає.
6. **Перша версія спеки.** Форк зроблено до тегу `spec-v0.1` (якщо вже після нього — цей крок робіть до PR
   бутстрапу, а `docs/bootstrap.md` закомітьте в ту саму гілку `sync/<останній тег>`: окремий PR бутстрапу впаде на
   `conformance` з `NO-ROW`), тож забирайте її тим самим потоком, що й кожну наступну (крок 8): `git fetch upstream --tags` →
   `git switch -c sync/spec-v0.1` → `git merge --no-edit spec-v0.1` →
   розкоментуйте `.spec-source` (`upstream: <pm>/<team-repo>`, `version: spec-v0.1`) → `npm run spec:source` (OK, не SKIP) →
   рядок у `docs/conformance.md` для кожного AC (ще не зроблене — `відкладено (причина)`) → `npm run ac:coverage` →
   коміт `.spec-source` і `docs/` → PR у форку, злитий кнопкою **Create a merge commit** (не Squash і не Rebase: тег має бути в історії `main`,
   інакше наступна синхронізація дасть конфлікти в `product/`). Потім скіл `spec-clarify` → питання як issues в upstream → журнал у `docs/spec-reading.md`.
7. **Реалізація:** `npx openspec new change impl-<зріз>` з `skip_specs: true` у `.openspec.yaml`, `design.md`,
   `tasks.md` («Done when: AC-…») → гілка → код + тести `it("AC-…: …")` → `/conformance` → PR у форку
   (CI зелений, `@coderabbitai review`). Тести з AC ID у назвах — лише після PR, що злив `sync/spec-v0.1`:
   до нього `npm run ac:coverage` падає з ORPHAN, бо таких AC в `openspec/specs/` форку ще немає.
   В останньому PR зрізу, **до merge**, `npx openspec archive impl-<зріз> -y`
   у тій самій гілці (ruleset не пускає прямі коміти в `main`) → merge.
8. **Нова версія спеки:** `git fetch upstream --tags` → `git switch -c sync/spec-v0.2` → `git merge --no-edit spec-v0.2` →
   оновити `.spec-source` → нові AC у `docs/conformance.md` → PR → **Create a merge commit**. Якщо попередній
   sync-PR злили squash-ем і merge дав конфлікти в `product/` чи `openspec/specs/`, беріть версію тегу й завершіть merge:
   `git checkout --theirs -- product openspec/specs` → `git add product openspec/specs` → `git commit --no-edit`.
   Термінове виправлення шаблону, а нового тегу ще немає: той самий `git cherry-pick <sha>` у форку PR-ом
   «Оновлення шаблону» (лише якщо коміт не чіпає `product/` і `openspec/`); пізніший merge тегу з тим самим
   комітом конфліктів не дає. Форк ще не синхронізований (`.spec-source` закоментований, а спека в upstream уже є) —
   cherry-pick робіть у гілку `sync/spec-vX.Y`, а не окремим PR: інакше `conformance` червоний.
9. **Пропозиція змінити спеку** (знайшли помилку чи прогалину): `git fetch upstream` →
   `git switch -c spec/<коротко> upstream/main` → зміна лише в `openspec/changes/<id>/` (`proposal.md` + дельта) →
   `git push -u origin spec/<коротко>` → PR в upstream (base `<pm>/<team-slug>:main`), тип «Зміна специфікації».
   Гілка від `upstream/main`, а не від `main` форку: інакше PR потягне ваш `src/` і `supabase/`. Рішення — за PM.

## Перевірки

| Команда | Що перевіряє |
|---|---|
| `npm run lint` / `typecheck` / `test` / `build` | ESLint без попереджень, типи (`next typegen` + `tsc`), Vitest, збірка з `ƒ Proxy (Middleware)` |
| `npm run spec:validate` | `openspec validate --all --strict` — структура специфікацій |
| `npm run spec:check` | AC ID на початку кожного `#### Scenario:` (схожий на ID, але з кириличною літерою чи трьома цифрами — з підказкою); унікальність у `openspec/specs` і після archive кожної активної зміни; denylist (за початком слова, тож ловить відмінки; фраза — і через перенесення рядка) у `product/`, `openspec/`, `docs/`, `src/`, `supabase/`, `tests/`, `README.md`, `AGENTS.md`; немає «бродячого» `product/denylist.local*` під іншим іменем; у кожній зміні без `skip_specs` — `proposal.md` з усіма сімома розділами в порядку правил |
| `npm run ac:coverage` | кожен AC має рядок у `docs/conformance.md`; статус дослівно «реалізовано» або «відкладено (причина)»; «реалізовано» має непропущений тест у `*.test.ts(x)` у `src/` чи `tests/` (їх запускає `npm test`), назва якого починається з ID; шляхи з колонок «Код»/«Тест» існують; тести не посилаються на неіснуючі AC. E2e-тести (`tests/e2e/*.spec.ts`) не рахуються, доки їх не запускає крок CI |
| `npm run spec:source` | у форку `product/` і `openspec/specs/` збігаються з тегом upstream із `.spec-source`; у CI форку FAIL, якщо спека вже у форку, а `.spec-source` закоментований, або `upstream:` — сам форк; попередження (не помилка), якщо в upstream уже є новіший тег `spec-v*` |

## Як цей шаблон зібрано з нуля

Повторюваний рецепт (Git Bash / macOS / Linux; Node 24, npm 11). Для нового клієнта зазвичай достатньо
«Use this template»; рецепт — щоб оновити шаблон на нові версії або зібрати його заново.

```bash
# 1. Скелет Next.js (версію зафіксовано; --turbopack не потрібен, --import-alias — за замовчуванням)
npx --yes create-next-app@16.4.0 my-project --ts --app --eslint --tailwind --src-dir --use-npm \
  --no-agent-feedback --no-cache-components
cd my-project
git branch -M main

# 2. Залежності (спершу @types/node 24 — інакше Vitest 5 дає ERESOLVE)
npm i -E @supabase/supabase-js@2.117.3 @supabase/ssr@0.12.7
npm i -D @types/node@^24
npm i -D -E supabase@2.120.0 @fission-ai/openspec@1.14.1 vitest@5.0.3
npm pkg set engines.node=24.x scripts.lint="eslint --max-warnings 0" \
  scripts.typecheck="next typegen && tsc --noEmit" scripts.test="vitest run" \
  scripts.spec:validate="openspec validate --all --strict" scripts.spec:check="node scripts/check-spec.mjs" \
  scripts.ac:coverage="node scripts/check-ac-coverage.mjs" scripts.spec:source="node scripts/check-spec-source.mjs" \
  scripts.db:push="supabase db push" \
  scripts.db:types="supabase gen types typescript --linked > src/lib/supabase/database.types.ts" \
  scripts.users:demo="node --env-file=.env.local scripts/create-demo-users.mjs"
printf '\n!.env.example\n/product/denylist.local*\n' >> .gitignore
# !.env.example — .env.example комітимо (правило після `.env*` скасовує його для цього файлу);
# /product/denylist.local* — справжні назви клієнтів для spec:check лише локально (зірочка ловить і denylist.local.txt.txt, якщо Провідник приховав розширення)
printf '* text=auto eol=lf\n*.ico binary\n*.png binary\n' > .gitattributes

# 3. Supabase: конфіг і міграція
npx supabase init
# supabase/config.toml: [api] auto_expose_new_tables = false; [auth] site_url = "http://localhost:3000",
#   additional_redirect_urls = ["http://localhost:3000/**"], enable_signup = false (користувачі — лише
#   npm run users:demo через Admin API); [auth.email] enable_confirmations = false
# supabase/migrations/20261012000000_profiles_and_roles.sql, supabase/seed.sql, supabase/demo-users.json

# 4. OpenSpec: глобальний CLI тієї ж версії (його викликають /opsx:* і скіли), профіль custom з verify
#    (глобальний конфіг цієї машини), потім init
npm i -g @fission-ai/openspec@1.14.1 && openspec --version   # 1.14.1
export OPENSPEC_TELEMETRY=0
npx openspec config set profile custom
npx openspec config set workflows '["propose","explore","apply","verify","update","sync","archive"]'
npx openspec init --tools claude,cursor --language Ukrainian --profile custom
npx openspec update
# openspec/config.yaml: context + rules (кожен пункт у лапках); порожні openspec/specs і openspec/changes з .gitkeep

# 5. Перенести з цього шаблону файли, написані вручну:
#   src/proxy.ts, src/lib/supabase/*, src/app/{layout.tsx,page.tsx,login/*}, scripts/**, tests/**, vitest.config.mts,
#   .claude/{settings.json,commands/conformance.md,skills/spec-*}, .cursor/commands/conformance.md, .cursorignore, .mcp.json,
#   .github/**, .coderabbit.yaml, AGENTS.md (наші розділи після блоку Next.js), CLAUDE.md,
#   product/**, docs/**, .env.example, .spec-source
rm -r public   # демо-SVG скелета шаблон не використовує
# tsconfig.json: "exclude" + "tests/fixtures"; eslint.config.mjs: globalIgnores + "tests/fixtures/**"

# 6. Перевірити
npm run lint && npm run typecheck && npm test && npm run build
npm run spec:validate && npm run spec:check && npm run ac:coverage && npm run spec:source
```

У Windows PowerShell 5.1 лапки всередині JSON треба екранувати:
`npx openspec config set workflows '[\"propose\",\"explore\",\"apply\",\"verify\",\"update\",\"sync\",\"archive\"]'`
(або інтерактивно: `npx openspec config profile`). Змінна середовища: `$env:OPENSPEC_TELEMETRY = "0"`.

Чому саме так — коротко:

- `--no-cache-components`: з Cache Components за замовчуванням (16.4) офіційний патерн Supabase для захищеної
  сторінки не збирається; `proxy.ts` з `--src-dir` має лежати в `src/`, інакше його мовчки ігнорують.
- `setAll(cookies, headers)` у `src/lib/supabase/proxy.ts` копіює заголовки кешування у відповідь (`@supabase/ssr` ≥ 0.10).
- `auto_expose_new_tables = false`: як у хмарі — нові проєкти без автогрантів приблизно з 30.05.2026, усі — з 30.10.2026.
- Профіль OpenSpec зберігається на машині, а не в репозиторії, тому згенеровані `.claude/` і `.cursor/` закомічені.

## Журнал виправлень шаблону

Виправлення після дня 0. Викладач оголошує кожне в чаті курсу з SHA; PM переносить його в upstream
(«Шлях PM», крок 7), розробники отримують із наступним тегом спеки.

| Дата | SHA | Що виправлено | Чіпає `product/`? |
|---|---|---|---|
| — | — | поки немає | — |

## Ліцензія

MIT — див. [LICENSE](LICENSE): шаблон можна вільно брати для власних і клієнтських проєктів. Протокол уточнень у
`.claude/skills/spec-clarify` адаптовано з [GitHub Spec Kit](https://github.com/github/spec-kit) (MIT, Copyright GitHub, Inc.).
