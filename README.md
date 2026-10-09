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
  `spec-clarify` (розробник) і `spec-review` (PM) — однаково в Claude Code і Cursor; `.mcp.json` з Supabase MCP
  лише на читання; `.claude/settings.json` забороняє читати `.env*` і деструктивні команди Supabase CLI.
- **Ворота:** GitHub Actions (`spec`, `app`, `conformance` у форках, `db` у форках із секретами),
  шаблон PR, форма issue «Питання до специфікації», `.coderabbit.yaml`.

| Шар курсу | Де в шаблоні |
|---|---|
| Правила й команди | `AGENTS.md`, `CLAUDE.md`, `.claude/commands/`, `.cursor/commands/` |
| Скіли | `.claude/skills/` (Cursor читає цю ж теку) |
| MCP з мінімальними правами | `.mcp.json`, `.claude/settings.json` |
| Специфікації | `product/`, `openspec/`, `scripts/check-*.mjs`, `docs/conformance.md` |

## Модель репозиторіїв

```text
шаблон (цей репозиторій)
  └─ «Use this template» → upstream PM  <pm>/<team-repo>     ← product/, openspec/ (лише PM), теги spec-vX.Y
        ├─ fork → <dev1>/<team-repo>  ← код, міграції, тести; свій Supabase і Vercel
        └─ fork → <dev2>/<team-repo>  …
```

Розробник змінює специфікацію лише PR-ом в upstream або питанням (issue `spec-question`).
Нову версію спеки забирає у форк гілкою `sync/spec-vX.Y`.

## Перед початком (PM і розробники)

- Node 24 (`node -v`), Git, GitHub CLI (`gh`).
- OpenSpec CLI **глобально** й тієї ж версії, що в `package.json`:
  `npm i -g @fission-ai/openspec@1.14.1` → `openspec --version` має показати `1.14.1`
  (стара глобальна версія — оновіть тією ж командою). Команди `/opsx:*` і скіли `openspec-*` викликають
  просто `openspec`, а в PATH оболонки агента немає `node_modules/.bin`. Скрипти `npm run spec:*` і CI
  беруть версію з devDependencies. Телеметрію вимикає `openspec config set telemetry.enabled false`.

## Шлях PM

1. **Upstream.** На сторінці шаблону — **Use this template → Create a new repository**, власник — ваш акаунт,
   назва — слаг команди, **Public**. Settings → Rules → Rulesets: для `main` — Require a pull request,
   Require status checks (`spec`, `app`).
2. **Продукт.** Заповніть `product/vision.md`, `glossary.md`, `roles.md` (матриця прав), `roadmap.md`.
   Справжні назви клієнта — не в файли репозиторію, а в локальний `product/denylist.local.txt` (у `.gitignore`;
   `npm run spec:check` читає його, але значень не друкує) і в секрет `SPEC_DENYLIST` (Settings → Secrets and
   variables → Actions) для CI.
   Створіть мітку для питань розробників (форма issue ставить лише наявну мітку):
   `gh label create spec-question --repo <pm>/<team-repo> --description "Питання до специфікації"`.
3. **Перший зріз.** `npm ci`, `openspec --version` = `1.14.1` (див. «Перед початком»), потім у Claude Code
   `/opsx:propose <опис зрізу>` (у Cursor `/opsx-propose`) або вручну: `npx openspec new change add-<зріз>` → `proposal.md` + `specs/<capability>/spec.md`.
   Формат (вимоги EARS з SHALL, `#### Scenario: AC-<AREA>-<NN> …`) агент бере з `openspec/config.yaml`.
4. **Перевірка.** `npm run spec:validate`, `npm run spec:check`, скіл `spec-review`.
5. **Реліз.** PR зі зміною → рев'ю команди → у тій самій гілці, **до merge**, `npx openspec archive add-<зріз> -y`
   і запис у `product/CHANGELOG.md` (ruleset не пускає прямі коміти в `main`) → merge →
   `git switch main && git pull && git tag spec-v0.1 && git push origin spec-v0.1`.
6. **Питання розробників.** Відповідайте в issues `spec-question`; рішення — у `product/decisions.md`;
   якщо змінюється поведінка — нова зміна (MODIFIED/ADDED) і тег `spec-v0.2`.

## Шлях розробника

1. **Форк** upstream PM у свій акаунт; Actions → увімкнути workflows; локально:
   `git clone https://github.com/<я>/<team-repo>.git` → `gh repo set-default <я>/<team-repo>`
   (інакше `gh pr create` цілить в upstream) → `git remote add upstream https://github.com/<pm>/<team-repo>.git`.
   Ruleset на `main` (PR + статуси `spec`, `app`, `conformance`).
2. **Залежності:** Node 24 (`node -v`), `openspec --version` = `1.14.1` (див. «Перед початком»), `npm ci`,
   `npm run typecheck`, `npm test`.
3. **Supabase** (власна організація, не через Vercel Marketplace): створіть проєкт; Authentication →
   Sign In / Providers → Email → вимкніть Confirm email; `npx supabase login` → `npx supabase link --project-ref <ref>` →
   `npx supabase db push --dry-run` → `npm run db:push` → `npm run db:types`.
   `.env.local` за зразком `.env.example` → `npm run users:demo` → `npm run dev` → вхід як `admin@example.test`.
4. **Vercel** (Hobby): Add New → Project → імпорт форку; змінні `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` для Production і Preview → редеплой.
   Supabase → Authentication → URL Configuration: Site URL = прод-URL, Redirect URLs `http://localhost:3000/**`
   і `https://*-<slug>.vercel.app/**`. Для навчальних проєктів вимкніть Vercel Authentication на preview.
5. **Секрети CI** (для job `db`): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`.
6. **Перша версія спеки.** Форк зроблено до тегу `spec-v0.1`, тож забирайте її тим самим потоком, що й кожну
   наступну (крок 8): `git fetch upstream --tags` → `git switch -c sync/spec-v0.1` → `git merge spec-v0.1` →
   розкоментуйте `.spec-source` (`upstream: <pm>/<team-repo>`, `version: spec-v0.1`) → `npm run spec:source` (OK) →
   рядок у `docs/conformance.md` для кожного AC (ще не зроблене — `відкладено (причина)`) → `npm run ac:coverage` →
   PR у форку, злитий кнопкою **Create a merge commit** (не Squash і не Rebase: тег має бути в історії `main`,
   інакше наступна синхронізація дасть конфлікти в `product/`). Потім скіл `spec-clarify` → питання як issues в upstream → журнал у `docs/spec-reading.md`.
7. **Реалізація:** `npx openspec new change impl-<зріз>` з `skip_specs: true` у `.openspec.yaml`, `design.md`,
   `tasks.md` («Done when: AC-…») → гілка → код + тести `it("AC-…: …")` → `/conformance` → PR у форку
   (CI зелений, `@coderabbitai review`). В останньому PR зрізу, **до merge**, `npx openspec archive impl-<зріз> -y`
   у тій самій гілці (ruleset не пускає прямі коміти в `main`) → merge.
8. **Нова версія спеки:** `git fetch upstream --tags` → `git switch -c sync/spec-v0.2` → `git merge spec-v0.2` →
   оновити `.spec-source` → нові AC у `docs/conformance.md` → PR → **Create a merge commit**. Якщо попередній
   sync-PR злили squash-ем і merge дав конфлікти в `product/` чи `openspec/specs/`, беріть версію тегу:
   `git checkout --theirs -- product openspec/specs`. Докази бутстрапу — у `docs/bootstrap.md`.

## Перевірки

| Команда | Що перевіряє |
|---|---|
| `npm run lint` / `typecheck` / `test` / `build` | ESLint без попереджень, типи (`next typegen` + `tsc`), Vitest, збірка з `ƒ Proxy (Middleware)` |
| `npm run spec:validate` | `openspec validate --all --strict` — структура специфікацій |
| `npm run spec:check` | AC ID на початку кожного `#### Scenario:`; унікальність у `openspec/specs` і після archive кожної активної зміни; denylist (за початком слова, тож ловить відмінки) |
| `npm run ac:coverage` | кожен AC має рядок у `docs/conformance.md`; статус дослівно «реалізовано» або «відкладено (причина)»; «реалізовано» має непропущений і не закоментований тест з ID у назві; тести не посилаються на неіснуючі AC |
| `npm run spec:source` | у форку `product/` і `openspec/specs/` збігаються з тегом upstream із `.spec-source` |

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
sed -i 's/^\.env\*$/.env*\n!.env.example/' .gitignore   # .env.example комітимо (GNU sed; на macOS — допишіть рядок вручну)
printf '* text=auto eol=lf\n*.ico binary\n*.png binary\n' > .gitattributes

# 3. Supabase: конфіг і міграція
npx supabase init
# supabase/config.toml: [api] auto_expose_new_tables = false; [auth] site_url = "http://localhost:3000",
#   additional_redirect_urls = ["http://localhost:3000/**"]; [auth.email] enable_confirmations = false
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
#   src/proxy.ts, src/lib/supabase/*, src/app/{page.tsx,login/*}, scripts/**, tests/**, vitest.config.mts,
#   .claude/{settings.json,commands/conformance.md,skills/spec-*}, .cursor/commands/conformance.md, .mcp.json,
#   .github/**, .coderabbit.yaml, AGENTS.md (наші розділи після блоку Next.js), CLAUDE.md,
#   product/**, docs/**, .env.example, .spec-source
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
- `auto_expose_new_tables = false`: як у хмарі, де з 30.10.2026 немає автогрантів на нові таблиці.
- Профіль OpenSpec зберігається на машині, а не в репозиторії, тому згенеровані `.claude/` і `.cursor/` закомічені.
