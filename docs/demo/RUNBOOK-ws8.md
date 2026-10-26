# RUNBOOK: демо WS8 «Якість: тести, evals, AI code review» — ворота, якість тестів, UAT, AI-рев'ю

Сценарій демо для заняття Вт 27.10.2026: що показати, які команди, що має вийти і що робити, якщо не вийшло (План Б).
Зразок формату — [`RUNBOOK-ws7.md`](RUNBOOK-ws7.md). Дані лише синтетичні (`*@example.test`).

Команди — PowerShell (Windows PowerShell 5.1 і PowerShell 7): без `&&`, кожна команда — окремим рядком. Що перевірено
26.10.2026 увечері у Windows PowerShell 5.1 (Node 24.18.0, npm 11.16.0; `npm.ps1` передає скриптам аргументи після
`--`):
- обов'язкові кроки демо 1 і 2, мутації SQL `--only L2,L5`, План A′ і передумови 2–5;
- повторно 26.10 ≈ 22:30–22:50 — генеральна репетиція (підсумок — на початку розділу 0): демо 1 і 2 повністю, з демо 3 —
  `npm run smoke` (з `$sha` і без, 2–4 с), «План lite» (`4 passed (14.2s)`, `AC-USERS-07 [claude-haiku-5-5] → PASS`,
  разом ≈ 26 с) і прибирання з розділу 7 (`1 passed`, `deleted: []`), з демо 4 — живий `/code-review`. Повний
  `npm run uat` не перезапускали, бо він пише в прод-базу: очікуване взято з прогону 26.10 ≈ 19:40. Ті самі
  специфікації на `a519424` зелені в CI `e2e` (`6 passed (16.0s)`, одноразовий Supabase).

Повні прогони з колонки «якщо є час» (`npm run test:coverage`, повні `mutation:ts` і `mutation:sql`) і живий
`/code-review` знято 26.10 в інших оболонках. На генеральній репетиції їх повторено в PowerShell 5.1: числа демо 2 ті
самі, `/code-review` — розділ 4, крок 4. Усі посилання на код ведуть на теги й коміти, а не на `main`: PR #34–#37 уже
злито 26.10, `main` = `a519424` і може зсунутися далі, а теги — ні.

Нового зрізу демо WS8 не додає — усе показуємо на наявних AC:

- **PR #33** з посадженими вадами (7 вад + 1 приманка; назва, коміти й опис нейтральні) — демо 1 і демо 4;
- `src/lib/leave/calendar.ts` і мутації SQL — демо 2;
- UAT на проді демо за трьома AC — демо 3.

**Ключа відповідей до PR #33 у репо немає й не буде** (репо публічне, а рецензент не має його бачити). Ключ, повна
таблиця рецензентів і дослівний вивід `/code-review` лежать поза репо (`$S` нижче). Тут — лише вивід інструментів,
який і так видно на екрані, і підсумкові числа.

```powershell
$S = 'D:\projects\clients\quitcode\ws8-private'
```

`$S` — уже приватна тека поза репо (не scratchpad): копіювати нічого не треба. З неї нічого не комітимо й на екран не
виводимо, крім JSON-виводу `/code-review` (розділ 4).

| Що | Де |
|---|---|
| PR #33 «Заявки й запрошення: дрібні покращення» | <https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/pull/33>, гілка `task/requests-polish`, head `a390345`. **Не зливати ніколи**: на `main` job `db-deploy` застосував би посаджену міграцію до прод-бази. Обов'язкові `spec`, `app`, `conformance`, `db-check` — зелені; червоний лише необов'язковий «Секретний ключ лише на сервері» (так задумано). CodeRabbit: рев'ю 26.10 17:38Z, стан `COMMENTED`, 6 inline-коментарів |
| PR #35 «WS8: ворота якості й якість тестів» | <https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/pull/35>, `ws8/quality`, head `e6789e4` = тег `ws8-02-tests`. 13 перевірок зелені, `db-deploy` пропущено. Нові з `quality.yml` — «Ворота: fallow audit», «Покриття: доменна підлога», «Порада: вразливі залежності» — дорадчі, у ruleset їх немає |
| PR #34 «WS8: e2e/UAT за AC і D0 (health + smoke)» | <https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/pull/34>, `ws8/e2e-uat`, head `2a41c33` = тег `ws8-03-uat`. Обов'язкові зелені; `e2e` зелений у 4 з 4 прогонів. **GitGuardian червоний — хибна тривога** (розділ 6), це не обов'язкова перевірка |
| Звіт UAT з проду (закомічено) | `docs/qa/uat/2026-10-26/report.md` і `frames/` на тезі `ws8-03-uat` — <https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/blob/ws8-03-uat/docs/qa/uat/2026-10-26/report.md> |
| `e2e` у CI (одноразовий `supabase start` у раннері) | <https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/actions/runs/40373586091> (head `2a41c33`) |
| Докази для Планів Б | `docs/demo/ws8/` у цій гілці (перелік — розділ 8) |
| Поза репо (не комітити) | `$S\planb\seeded\scorecard.md` — таблиця рецензентів і «вада × шар» для PR #33; `$S\seeded\answer-key.md` — ключ; `$S\planb\seeded\code-review.md` — вивід `/code-review` дослівно; `$S\planb\uat\run-prod-2026-10-26\` — HTML-звіт Playwright, траси й відео AC-USERS-11 (траси містять cookie сесій); `$S\skill-eval\` — eval скіла `spec-review` 26.10 (фікстури, грейдер, вивід 9 прогонів; розділ 4) |

| Тег / ref | Коміт | Що в ньому | Демо |
|---|---|---|---|
| `ws8-00-baseline` | `638d225` | `main` після PR #32 (next 16.4.3). Тести до WS8: 119 (з них 25 тестів бази), `ac:coverage` OK, 27 з 27 | 1 (база аудиту), 2 |
| `ws8-01-gates` | `44d39c2` | коміт A «детерміновані ворота»: fallow 3.35.0 + `.fallowrc.jsonc`; правила `@vitest/eslint-plugin` 1.6.27 на рівні error; покриття `@vitest/coverage-v8` 5.0.3 з підлогами для 9 доменних файлів; `quality.yml` (дорадчий); скрипти `gates`, `test:coverage`, `coverage:summary` | 1 |
| `ws8-02-tests` | `e6789e4` | коміт B «якість тестів»: 5 тестів бази (PGlite) на прогалини, межові тести AC-LEAVE-11 і AC-USERS-02, `scripts/mutation-check.mjs` + `scripts/mutants.mjs` (11 SQL + 2 TS), StrykerJS 10.1.1; 127 тестів | 1, 2 |
| `ws8-03-uat` (легкий тег) | `2a41c33` | Playwright 1.64.1: E2E = UAT за AC, `scripts/uat/*`, звіт `docs/qa/uat/2026-10-26/`, `e2e.yml`, `/api/health`, `scripts/smoke.mjs`, `smoke.yml` | 3 |
| PR #33 (без тегу) | `a390345` | 8 нейтральних комітів від `ws8-00-baseline` | 1, 4 |

**Хронометраж — за колодою (Time cue в нотатках слайдів демо):** демо 1 ≈ 4 хв, демо 2 ≈ 5 хв і слайд «Мутації SQL»
≈ 2 хв, демо 3 ≈ 5 хв, демо 4 ≈ 4 хв. Кроки **обов'язково** вкладаються в цей час; «якщо є час» — лише коли демо йде
швидше. **Кожен живий запуск — не довше 2 хв**, далі План Б (остання колонка). У конспекті ведучого
(`docs/konspekt.md` деки, «Пріоритет джерел») сказано, що RUNBOOK має пріоритет: там, де колода й цей файл
розходяться, правильно тут (розділ 6, таблиця «Колода ↔ RUNBOOK»).

## 0. Передумови (увечері й за годину до заняття)

**Генеральна репетиція 26.10 ≈ 22:30–22:50** (Windows PowerShell 5.1; `main` = прод = `a519424`):
- **пройшло:** демо 1, кроки 1–7 (у тимчасовій копії `lp-ws8-quality`, зібраній командами пп. 7–8; обов'язкові кроки
  разом ≈ 11 с машинного часу); демо 2, кроки 1–11, «Мутації SQL» 1–3 і План A′ (вивід збігся до цифри, обов'язкові
  команди разом ≈ 54 с); з демо 3 — smoke з `$sha` і без, «План lite» і лише прибирання; з демо 4 — живий
  `/code-review` (108 с, $0,024, 7 з 7 по суті). PR #33 не змінився: head `a390345`, одне рев'ю CodeRabbit 17:38:43Z;
- **середовище:** без змінних агента — демо 2 і дочірній `claude -p` демо 4; демо 1 і 3 — в оболонці агента (звідти
  рядок-підказка fallow і попередження `NO_COLOR`), а перевірку без змінних агента для fallow зроблено окремо
  (розділ 1, абзац під таблицею);
- **звірено лише через `gh api` і знімки:** кроки 1–3 демо 4 (6 inline-коментарів, порада в згорнутому зведенні). Шлях
  у браузері (розгорнути «Pre-merge checks» → рядок «Ac Id …» → Resolution) — відпрацювати вранці один раз;
- **не прорепетирувано:** повний `npm run uat` на проді (пише в прод-базу) і передумови AC-LEAVE-04 на проді
  (заблокований день 05.11.2026, підрозділ MATH) — уранці, п. 1;
- **після репетиції** `lp-ws8-quality` стоїть на `ws8-02-tests` з чистим деревом, тобто **не** в стані демо 1: уранці
  обов'язково п. 8 (`git status --short` → лише `?? .fallowrc.jsonc`).

1. **Supabase демо не на паузі.** PR #34 злито 26.10, тож на проді є `/api/health`: у теці `lp-ws8-uat` (пункт 7)
   `npm run smoke -- https://quitcode-ws6-leave-portal-demo.vercel.app` має дати `OK — прод живий, сторінка входу
   відкривається, база відповідає.` (вивід до злиття — `docs/demo/ws8/03-uat/smoke-prod-before-merge.txt`, тепер
   лише для історії). Якщо smoke не OK — перевірте:
   - Supabase Dashboard → проєкт демо: не «Paused» (якщо так — «Resume project»);
   - вхід `admin@example.test` на проді у вікні браузера (пароль — з менеджера паролів, не на сцені), головна
     відкривається. Сам `/login` 200 нічого не доводить: цю сторінку віддає застосунок без бази;
   - найкраща перевірка — репетиція UAT, яка нічого не пише (розділ 3, «План lite»).

   Стан 26.10 ≈ 19:40: Supabase відповідав, у базі 5 базових користувачів і 0 `uat-*`, заблокований день 05.11.2026
   (потрібен AC-LEAVE-04) на місці. 26.10 ≈ 22:35: smoke `OK` (`sha` `a519424`, `db: ok`), «План lite» `4 passed`,
   прибирання — `deleted: []`, `remaining: []` (0 `uat-*`). Заблокований день і підрозділ MATH о 22:35 не перевіряли:
   уранці — Supabase → Table Editor → `blocked_days` (рядок `2026-11-05`) і `divisions` (код `MATH`), лише перегляд.
   Без заблокованого дня AC-LEAVE-04 впаде на кроці «Дано» — FAIL за R1.
2. **Прод = `main` на next 16.4.3.** #35, #34 і #36 злито 26.10 (конфлікти розв'язано в #34), прод розгортається
   з `main`. У теці `lp-ws8-uat` (пункт 7):

   ```powershell
   git fetch origin
   $sha = git rev-parse origin/main
   npm run smoke -- https://quitcode-ws6-leave-portal-demo.vercel.app $sha
   ```

   Має вийти `OK — прод живий, сторінка входу відкривається, база відповідає.` (`/api/health` віддає `sha` = `main`,
   `db: ok`). Так було й на preview PR #34: `docs/demo/ws8/03-uat/smoke-preview-pr34.txt`.
   Записані докази зняті на тегах і на гілках PR до злиття — на сцені команди теж ідуть на тегах, тож вони збігаються.
3. **Теги й PR на місці.**

   ```powershell
   git fetch --tags --force
   git fetch origin task/requests-polish
   foreach ($t in 'ws8-00-baseline','ws8-01-gates','ws8-02-tests','ws8-03-uat','origin/task/requests-polish') { "$t -> $(git rev-parse --short "$t^{commit}")" }
   gh pr list --state open
   ```

   Очікувано: `638d225`, `44d39c2`, `e6789e4`, `2a41c33`, `a390345`; відкриті лише #33 (не зливати ніколи) і давній #6;
   #34, #35, #36 — злиті.
4. **Рев'ю CodeRabbit на #33 є:** `gh pr view 33 --json reviews -q '.reviews[].state'` → `COMMENTED` (26.10 17:38:43Z).
   Повторно **не тригерити**: ліміт — 1 рев'ю на годину (після рев'ю 26.10 — «0 remain»), повтор триває ≈ 6 хв і
   може змінити картину, яку ми показуємо. Після тригера в #33 нічого не пушили — head досі `a390345`.
5. **Версії інструментів** (перевірено 26.10 ≈ 20:15; уранці — ще раз):

   ```powershell
   npm view @stryker-mutator/core version
   npm view fallow version
   ```

   Очікувано: `10.1.1` (досі latest) і `3.36.0` (вийшла нова; демо закріплене на 3.35.0 і її не оновлюємо). У теці
   `lp-ws8-quality` (пункт 7): `npx fallow --version` → `fallow 3.35.0` і другий рядок `verified: yes (sentinel …); fallow 3.35.0 signed`, `npx stryker --version` → `10.1.1`. Якщо
   `npx stryker` питає «Need to install the following packages: stryker», це **інший, старий пакет**: відповісти `n`
   (у теці не зроблено `npm ci` на `ws8-02-tests`). До Stryker ніколи не додавати `--logLevel debug`: з vitest-runner
   10.1.1 і Vitest 5 він падає (stryker-js #6272, відкрите).
6. **Claude Code 2.1.308**, вхід за підпискою. `claude -p` потрібен для розбору UAT (Haiku 5.5, суперечки — Sonnet 5.5)
   і для живого `/code-review`.
7. **Теки.** Щоб не перемикати на сцені гілки основної теки (`2026-quitcode-06-leave-portal-demo` на `main`, у ній
   `.env.local`), робимо окремі робочі теки:

   ```powershell
   Set-Location D:\projects\clients\quitcode\2026-quitcode-06-leave-portal-demo
   git switch main
   git pull --ff-only
   git fetch --tags --force
   git fetch origin task/requests-polish
   git worktree add --detach ..\lp-ws8-quality ws8-02-tests
   git worktree add --detach ..\lp-ws8-uat origin/main
   git worktree add --detach ..\lp-ws8-seeded a390345
   Set-Location ..\lp-ws8-quality
   npm ci --no-audit --no-fund
   Set-Location ..\lp-ws8-uat
   npm ci --no-audit --no-fund
   npx playwright install chromium
   Copy-Item ..\2026-quitcode-06-leave-portal-demo\.env.local .
   Test-Path .env.local
   ```

   - `lp-ws8-quality` — для демо 1 і 2. `npm ci` саме на `ws8-02-tests` (≈ 23 с): fallow, Stryker, coverage-v8 і
     `@vitest/eslint-plugin` лишаються в `node_modules`, коли тека перемикається на `ws8-00-baseline` чи `a390345`.
     `npm ci --no-audit` рядка про вразливості не друкує, зате друкує
     `npm warn deprecated eslint@9.39.5: This version is no longer supported` (нешкідливо). Без `--no-audit` —
     «2 moderate severity vulnerabilities». Вони лише в dev-залежностях (`qs` через
     `@stryker-mutator/core`), `npm audit --omit=dev` чистий.
   - `lp-ws8-uat` — для демо 3. `.env.local` лише копіюємо: не відкривати, не друкувати, не показувати
     (`Test-Path` → `True`). Скрипти читають його самі (`process.loadEnvFile`); їм потрібні `DEMO_USER_PASSWORD`,
     `NEXT_PUBLIC_SUPABASE_URL` і `SUPABASE_SECRET_KEY` (синтетичні `uat-*` і прибирання). Chromium 1248 на цій машині
     вже стоїть після UAT-прогону 26.10, тож `playwright install` займе секунди. Попередження allow-scripts про
     `unrs-resolver` з'являється на кожному `npm ci` демо і нешкідливе.
   - `lp-ws8-seeded` — лише для живого `/code-review` (демо 4, «якщо є час»). `npm ci` тут не потрібен.
8. **Підготовка демо 1** (після репетиції; тека так і лишається до заняття):

   ```powershell
   Set-Location D:\projects\clients\quitcode\lp-ws8-quality
   git switch --detach a390345
   git checkout ws8-01-gates -- .fallowrc.jsonc
   git reset -q -- .fallowrc.jsonc
   git status --short
   ```

   Очікувано: `?? .fallowrc.jsonc` — конфіг воріт з `ws8-01-gates` лежить поруч із кодом PR #33 і не потрапляє в індекс.
9. **Репетиція** (увечері або за годину): демо 1 і 2 повністю в `lp-ws8-quality` (розділи 1–2, ≈ 3 хв; перший Stryker
   на холодну довший), потім прибирання з розділу 7 (`git status --short` порожній) і знову пункт 8. Демо 3 — лише
   «План lite» (розділ 3), а одразу після нього в `lp-ws8-uat` — прибрати звіт за датою прогону (за Києвом). Прогін
   26.10 перезаписує закомічений звіт, на якому стоїть План Б (до відновлення `git status --short` показує
   ` D …/frames/AC-LEAVE-04-then-1.png`, ` D …/frames/AC-USERS-11-then-1.png`, ` M …/manifest.json`, ` M …/report.md`)
   → `git restore docs/qa/uat/2026-10-26`. Прогін 27.10 (репетиція за годину) пише в ту саму теку, що й живий →
   `Remove-Item -Recurse -Force docs\qa\uat\2026-10-27`. Потім `git status --short` — порожньо.
10. **Термінали й вкладки.**
    - Термінал 1 — **звичайний** PowerShell, не термінал агента: у сесії агента Vitest ховає з текстової таблиці
      покриття файли зі 100 % (замість рядка `calendar.ts | 100 …` — лише `1 file fully covered.`), а fallow дописує
      рядок `<claude-code-hint …>` (перевірено 26.10). «Термінал агента» — будь-яка оболонка зі змінною `CLAUDECODE`,
      `AI_AGENT` тощо (бібліотека std-env), зокрема запущена з Claude Code. Перевірка в терміналі 1, у теці
      `lp-ws8-quality`: `node -e "import('std-env').then(m=>console.log(m.isAgent))"` → `false`, а
      `Get-ChildItem Env: | Where-Object Name -match '^(CLAUDE|AI_AGENT)'` нічого не друкує. Тека `lp-ws8-quality`,
      шрифт ≥ 18.
    - Термінал 2 — PowerShell, `lp-ws8-uat`.
    - Термінал 3 (якщо є час, демо 4) — `lp-ws8-seeded`, лише для `claude -p`; теж звичайний PowerShell (розділ 4).
      fallow і плагіна лінтера там немає: `npx fallow` запропонує встановити `fallow@3.36.0` — відповісти `n`. Демо 1 —
      лише в терміналі 1.
    - Редактор: `lp-ws8-quality`, відкрито `src/lib/leave/calendar.ts` (рядок 14) і `tests/leave/calendar.test.ts`.
    - Браузер: PR #33 → Checks; PR #33 → Files changed (коментарі CodeRabbit); PR #35 → Checks (три перевірки
      `quality.yml`); PR #34 → Checks; `docs/demo/ws8/` на GitHub (гілка `ws8/runbook`); прод-URL; Supabase →
      Authentication → Users (для прибирання).
    - Сповіщення вимкнено. Паролі й `.env.local` на екран не потрапляють.

## 1. Демо 1 — ворота на PR #33 (блок 01, слайд «Демо 1 — ворота на демо», ≈ 4 хв) — `lp-ws8-quality`

Ідея: обов'язковий CI на PR з вадами зелений, а fallow і тестові правила лінтера ловлять частину вад за секунди, з
файлом і рядком. Тека вже на `a390345` з конфігом воріт (передумова 8).

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | Браузер: PR #33 → Checks (або `gh pr checks 33`) | `app`, `spec`, `conformance`, `db-check` — `pass` (обов'язкові); `Секретний ключ лише на сервері` — `fail` (необов'язковий `architecture`); `CodeRabbit` — `pass` (лише коментарі); `db-deploy` — `skipping`. У звичайному терміналі `gh` друкує не ці слова, а значки й підсумок: `Some checks were not successful`, `0 cancelled, 1 failing, 9 successful, 1 skipped, and 0 pending checks`, `X  architecture/Секретний ключ л...`, `✓  CI/app (pull_request)`, `-  CI/db-deploy (pull_request)`; exit 1 через одну червону перевірку — так і має бути. На шрифті ≥ 18 назви обрізаються ще більше, тож краще вкладка Checks у браузері. Сказати: «за обов'язковими перевірками PR готовий до злиття» | `docs/demo/ws8/01-gates/pr33-checks.txt` |
| 2 | **обов'язково** | `npx fallow audit --base ws8-00-baseline --no-cache` | ≈ 2–3 с (fallow 1,6 с + старт `npx`), exit 1. `Audit scope: 9 changed files vs ws8-00-baseline` (8 файлів PR + сам `.fallowrc.jsonc`); `● Unused server actions (1)` — `src/app/manage/actions.ts :46 exportQueueCsv is exported from a "use server" file but no code in this project references it`; «Diff risk»: `src/app/admin/users/actions.ts:26  test-only-branch [error]  process.env.NODE_ENV`, `tests/leave/decisions.test.ts  weakened-tests (assertion-drop) [error]  assertions: 10 -> 9`, `tests/leave/decisions.test.ts:17  weakened-tests (skip-only) [error]  it.skip`; підсумок `✗ dead code: 1 issue · complexity: 7 findings · diff risk: 3 findings · 9 changed files`, `audit gate excluded 6 inherited findings`. Наголос: однаково на кожному прогоні, за секунди, з файлом і рядком — агент виправить це сам | `…/01-gates/pr33-fallow-audit-ws8-config.txt`; без конфігу ті самі знахідки — лише попередження, exit 0: `…/pr33-fallow-audit-zero-config.txt` |
| 3 | **обов'язково** | `git checkout ws8-01-gates -- eslint.config.mjs`, потім `npx eslint tests/leave/decisions.test.ts` | ≈ 3–5 с (на холодну 4,5 с), exit 1: `17:6  error  Disabled test - if you want to skip a test temporarily, use .todo() instead  vitest/no-disabled-tests`. Сказати: у PR правил WS8 ще немає, тому CI зелений; з ними обов'язковий `app` червоніє (`npm run lint` дає 2 помилки: ця й успадкована `tests/leave/submission.test.ts:35 vitest/no-conditional-in-test`, яку виправлено в `ws8-01-gates`). `git status --short` тепер — `M  eslint.config.mjs` (файл у індексі) і `?? .fallowrc.jsonc`. **Крок 2 після цього не повторювати**: з `eslint.config.mjs` з воріт audit дає `10 changed files` і п'яту знахідку `Unlisted dependencies (1) @vitest/eslint-plugin` (`✗ dead code: 2 issues`) | `…/pr33-eslint-ws8-decisions-test.txt`, `…/pr33-lint-ws8-full.txt` |
| 4 | якщо є час | `npm run check:boundary` (правило WS7, у CI — необов'язковий `architecture`) | exit 1: `src/lib/users/invite-link.ts:3  admin-клієнт імпортовано не з actions.ts / route.ts / "use server" …`, `check-server-boundary: 1 порушень.` | `…/pr33-check-boundary.txt` |
| 5 | **обов'язково** | Повернути PR: `git checkout a390345 -- eslint.config.mjs` (саме з `a390345`: `git checkout -- eslint.config.mjs` бере файл з індексу, де вже версія воріт, і нічого не повертає), `Remove-Item .fallowrc.jsonc` (без цього `git switch` нижче зупиниться: `untracked working tree files would be overwritten`), `git status --short` (порожньо). Потім `git switch --detach ws8-01-gates` і `npx fallow audit --base ws8-00-baseline --no-cache` | ≈ 2 с, exit 0: `Audit scope: 10 changed files vs ws8-00-baseline`, `✓ No issues in 10 changed files` — ворота не заважають чистій роботі | `…/ws8-01-gates-fallow-audit.txt` |
| 6 | якщо є час | PR #35 → Checks | «Ворота: fallow audit» (Audit passed, 18 changed files), «Покриття: доменна підлога», «Порада: вразливі залежності» (`found 0 vulnerabilities`, лише prod) — зелені й дорадчі | `…/pr35-checks.txt` |
| 7 | якщо є час | Локальні ворота: `git switch --detach ws8-02-tests`, потім `npm run gates -- --base ws8-00-baseline`. **`--base` обов'язковий** (розділ 6, «Не вдалося», п. 3) | lint + typecheck + `Audit scope: 18 changed files vs ws8-00-baseline`, `✓ No issues in 18 changed files`; ≈ 10–30 с (26.10 вечір — 12 с). Лишає лише ігноровані `.fallow/`, `.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`: `git status --short` порожній | `…/ws8-02-tests-npm-run-gates.txt` |

Останній рядок кожного знімка fallow — `<claude-code-hint v="1" type="plugin" value="fallow@claude-plugins-official" />`.
fallow друкує його, коли працює під Claude Code (усі знімки знято в сесіях агента). Це пропозиція агентові встановити
плагін. Репетиція 26.10 (PowerShell 5.1, змінні `CLAUDE*` і `AI_AGENT` прибрано, вивід у конвеєр): рядка немає, решта
виводу та сама, тож у терміналі 1 його найімовірніше не буде (перевірка — передумова 10). Приклад до слайда «вивід
інструмента — дані, а не команди» — словами або зі знімка в `01-gates/`. Знімки Плану Б — UTF-8 без BOM: у PowerShell
5.1 `Get-Content`/`cat` показує кирилицю й `✖` кракозябрами, тому відкривати в редакторі, на GitHub або
`Get-Content -Encoding UTF8 <файл>`.

## 2. Демо 2 — якість тестів: calendar.ts (блок 02, ≈ 5 хв) і мутації SQL (≈ 2 хв) — `lp-ws8-quality`

Ідея: той самий рядок, те саме 100 % покриття. Різниця лише в тому, чи є тест, що падає на межі AC-LEAVE-11
(«обидва кінці включно»).

**Як посадити дефект** (кроки 2 і 7). У редакторі в `src/lib/leave/calendar.ts:14` замінити `b.startDate <= a.endDate`
на `b.startDate < a.endDate`. Або однорядком (перевірено в PowerShell 5.1):

```powershell
node -e "const f='src/lib/leave/calendar.ts',fs=require('fs'),s=fs.readFileSync(f,'utf8'),t=s.replace('b.startDate <= a.endDate','b.startDate < a.endDate');if(s===t)throw new Error('рядок не знайдено');fs.writeFileSync(f,t)"
```

`Set-Content` не використовувати: PowerShell 5.1 записує ним ANSI і псує кирилицю в коментарях. Перед кожним Stryker
(кроки 5 і 8) `git diff --stat` має бути порожнім: якщо редактор знову зберіг дефект, на кроці 8 Stryker падає з
`ConfigError: There were failed tests in the initial test run.` (перевірено 26.10), а на кроці 5 цифри не збігаються з
очікуваними. Тоді `git checkout -- src/lib/leave/calendar.ts`, відкотити буфер редактора й повторити.

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | `git switch --detach ws8-00-baseline`, потім `npm run -s ac:coverage` | `ac:coverage — AC у вимогах PM (requirements/): 17, AC у специфікаціях: 28, рядків у матриці: 28, «реалізовано»: 27, AC у назвах тестів: 27` і `OK` — кожен AC має тест | сказати словами |
| 2 | **обов'язково** | Посадити дефект (вище), `git diff` | змінено 1 рядок: `return a.startDate <= b.endDate && b.startDate < a.endDate;` | — |
| 3 | **обов'язково** | `npm test` | ≈ 9–10 с: `Test Files  14 passed (14)`, `Tests  119 passed (119)`. Сказати: заявка, що закінчується в перший день іншої заявки працівника, тепер проходить | `docs/demo/ws8/02-tests/live-demo/01-baseline-bug-npm-test.txt` |
| 4 | **обов'язково** | `npx vitest run --coverage.enabled --coverage.include=src/lib/leave/calendar.ts`, потім `Start-Process coverage\calendar.ts.html` | ≈ 10–16 с: `calendar.ts \| 100 \| 100 \| 100 \| 100` (у терміналі агента цього рядка не видно, лише `1 file fully covered.` — передумова 10); у HTML рядок 14 зелений і містить `<` | `…/02-tests/screenshots/01-coverage-calendar-100-with-bug.png`; HTML — `…/live-demo/coverage-baseline-bug-calendar/calendar.ts.html`; текст — `…/live-demo/02-baseline-bug-coverage-calendar.txt` |
| 5 | **обов'язково** | `git checkout -- src/lib/leave/calendar.ts`, потім `npx stryker run --testRunner vitest --mutate src/lib/leave/calendar.ts --reporters clear-text,html` (на базовому тегу конфігу Stryker немає — лише прапорці) | ≈ 6 с (перший прогін на холодну — до 20 с): `[Survived] ConditionalExpression` і `[Survived] EqualityOperator`, обидва `src/lib/leave/calendar.ts:14:38` (`<=` → `<` — той самий дефект); `calendar.ts \| 93.33 \| 93.33 \| 28 \| 0 \| 2`. HTML — `Start-Process reports\mutation\mutation.html` | `…/screenshots/02-stryker-calendar-baseline-2-survived.png`, `…/live-demo/03-baseline-stryker-calendar.txt`, `…/live-demo/stryker-calendar-baseline.html` |
| 6 | **обов'язково** | `git switch --detach ws8-02-tests`; у редакторі `tests/leave/calendar.test.ts`, рядки 35–46: два кейси з тексту AC-LEAVE-11, не з коду — «нова заявка 02.11–03.11 закінчується в день початку заявки pending 03.11–04.11 — OVERLAPPING_REQUEST» і «заявка 01.11–02.11 цілком раніше за pending 03.11–04.11 — приймається» | тести вже на тезі, наживо не пишемо | ті самі рядки на GitHub, тег `ws8-02-tests` |
| 7 | **обов'язково** | Той самий дефект (однорядком), потім `npm test` | ≈ 10 с, exit 1: `Tests  1 failed \| 126 passed (127)`, `× AC-LEAVE-11: нова заявка 02.11–03.11 закінчується в день початку заявки pending 03.11–04.11 — OVERLAPPING_REQUEST` | `…/live-demo/04-ws8-02-bug-npm-test.txt` |
| 8 | **обов'язково** | `git checkout -- src/lib/leave/calendar.ts`, потім `npm run mutation:ts -- --mutate src/lib/leave/calendar.ts` | ≈ 5 с: `calendar.ts \| 100.00 \| 100.00 \| 30 \| 0 \| 0` — 30 вбито, жоден не вижив | `…/screenshots/03-stryker-calendar-ws8-02-all-killed.png`, `…/live-demo/05-ws8-02-stryker-calendar.txt` |
| 9 | якщо є час | Покриття всього `src/**`: `npm run test:coverage`, потім `Start-Process coverage\index.html` | `127 passed`; рядки 32,01 % (146/456) — так само, як до нових тестів: вони не додають покриття рядків, а вбивають мутантів; `messages.ts` і `src/app/**` — 0 % | `…/screenshots/04-coverage-index-all-files.png`, `…/coverage-summary-ws8-02-tests.md` |
| 10 | якщо є час | Мутації всього домену: `npm run mutation:ts` (505 мутантів, ≈ 14 с) | 81,98 % (413 вбито, 1 timeout, 51 вижив, 40 без покриття); з тестами до WS8 — 80,59 % (406 / 1 / 58 / 40) | `…/screenshots/05-stryker-full-baseline-80.59.png`, `…/06-stryker-full-ws8-02-81.98.png`, `…/stryker-full-*.txt` |
| 11 | якщо є час | PR #33 у блоці 02 (вада в логіці й видалений assert): `git switch --detach a390345`, `npx fallow mutation src/lib/leave/decisions.ts --allow-dirty`, потім `Remove-Item -Recurse -Force .fallow` | ≈ 7 с: `Score 84.6%  killed 44  survived 8`; серед вижилих `38:7 requestStatus negate-condition … -> if (true) return "approved";` і `39:10 return "pending"; -> return "";`. На `ws8-00-baseline` той самий файл — `Score 96.4%  killed 53  survived 2`. `--allow-dirty` обов'язковий, якщо в теці є будь-які незакомічені файли (наприклад, `reports/`): без нього fallow 3.35.0 зупиняється з exit 2: `Error: the git worktree has 2 uncommitted paths: reports/mutation/mutation.html, reports/mutation/mutation.json`. `.fallow/` видалити, бо інакше lint лаятиметься на її файли, а наступний прогін візьме результати з кешу (≈ 2 с, `Cache: 52 results came from an earlier run`, без рядків прогресу) | `…/02-tests/pr33-fallow-mutation-decisions-branch.txt`, `…/pr33-fallow-mutation-decisions-baseline.txt` |

### Слайд «Мутації SQL» (≈ 2 хв) — та сама тека, `ws8-02-tests`

Скрипта мутацій на базовому тегу немає, тому стан «до» = тести з `ws8-00-baseline`, підкладені на `ws8-02-tests`.

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | `git switch --detach ws8-02-tests` (якщо робили крок 11), `git restore --source=ws8-00-baseline -- tests/`, потім `npm run mutation:sql -- --only L2,L5` | ≈ 5,5 с, exit 1: `✗ L2 SURVIVED AC-LEAVE-11 — перетин: діапазон НОВОЇ заявки напіввідкритий [початок, кінець) …`, `✗ L5 SURVIVED передумова AC-LEAVE-04/10 — blocked_days: insert дозволено будь-кому з входом, а не лише адміністратору`, `Мутаційний бал: 0 з 2 вбито (0 %)`. Сказати: Stryker мутує TS, а правило «заблокований день додає лише адміністратор» живе в політиці RLS — і його ніхто не перевіряв | `…/live-demo/06-sql-L2-L5-baseline-tests.txt` |
| 2 | **обов'язково** | `git restore --source=HEAD -- tests/`, потім та сама команда | ≈ 5,5 с, exit 0: `✓ L2 KILLED` (впав `AC-LEAVE-11: нова заявка, що закінчується в перший день наявної, — теж перетин, нічого не збережено`), `✓ L5 KILLED` (`заблокований день додає лише адміністратор; працівник і менеджер — ні`), `Мутаційний бал: 2 з 2 вбито (100 %)` | `…/live-demo/07-sql-L2-L5-ws8-02-tests.txt` |
| 3 | якщо є час | Усі 11: `npm run mutation:sql` | ≈ 21 с: 10 з 11 вбито, L6 прийнято як еквівалентний (причина — у `scripts/mutants.mjs`), exit 0. З тестами до WS8 — 6 з 11, вижили L2, L4, L5, L7 | `…/02-tests/mutation-sql-ws8-02-tests.txt`, `…/mutation-sql-baseline-tests.txt` |
| 4 | якщо є час | Чесність самого скрипта | заміна буквальна (`$$` у тілах plpgsql не псується); зламаний SQL дає `ERROR` (не входить у бал, exit 1), а не «вбитий» | `…/02-tests/mutation-check-fix-proof.txt` |

**План A′ (Stryker не стартував).** Те саме без Stryker, на `ws8-02-tests`: `git restore --source=ws8-00-baseline -- tests/`,
потім `node scripts/mutation-check.mjs --only T1,T2` → `✗ T1 SURVIVED`, `✗ T2 SURVIVED`, `0 з 2 вбито`;
`git restore --source=HEAD -- tests/` і та сама команда → `✓ T1 KILLED`, `✓ T2 KILLED`, `2 з 2 вбито`, ≈ 1,5 с. T1 — та
сама межа `calendar.ts` (AC-LEAVE-11), T2 — пароль рівно з 8 символів (AC-USERS-02). Вивід —
`…/02-tests/mutation-ts-points-baseline-tests.txt` і `…/live-demo/08-planA-T1-T2-ws8-02-tests.txt`.

**План Б (нічого не запускається):** скріншоти `docs/demo/ws8/02-tests/screenshots/01…06`, вивід кожного кроку —
`…/live-demo/01…08`.

## 3. Демо 3 — UAT на проді демо (блок 03, ≈ 5 хв) — `lp-ws8-uat`

**Що прогін пише в прод-базу.** AC-USERS-07 нічого не пише. AC-USERS-11 створює запрошення `uat-<run>@example.test`,
а AC-LEAVE-04 — синтетичного працівника `uat-<run>-employee@example.test` (посада MATH) із заявкою на розгляді. Обох
видаляє сам тест, а teardown `cleanup` перевіряє, що нічого не лишилось (`remaining: []`, `leftoverRequests: 0`).
Поки прогін триває (≈ 40 с), заявку синтетичного працівника видно в черзі менеджера MATH — цю чергу на сцені не
відкривати. Даних демо (5 базових користувачів) прогін не змінює.

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | `npm run uat -- --url https://quitcode-ws6-leave-portal-demo.vercel.app` (без `--url` скрипт збирає й запускає застосунок локально) | ≈ 40 с Playwright і ≈ 30 с розбору, разом ≈ 1 хв 07 с: `6 passed` (2 входи setup, 3 AC, 1 cleanup); далі `AC-USERS-11 [claude-haiku-5-5] → PASS`, `AC-USERS-07 [claude-haiku-5-5] → PASS`, `AC-LEAVE-04 [claude-haiku-5-5] → NEEDS-HUMAN`, `AC-LEAVE-04 [claude-sonnet-5-5] → NEEDS-HUMAN … (суперечка → Sonnet)`, `Звіт: docs/qa/uat/2026-10-27/report.md`, `Є NEEDS-HUMAN: рішення — за PM`. Exit 0 (1 — лише за FAIL). Розбір ≈ $0,05 за цінами API (за підпискою — у межах плану). **Очікувано не «усе зелене»:** AC-LEAVE-04 майже напевно знову NEEDS-HUMAN — на кадрі моноширинним шрифтом тире «–» між датами не відрізнити від дефіса, хоча локатор цей символ уже перевірив. Це і є урок R3: перевірки зелені, агент не впевнений — вирішує людина | закомічений звіт 26.10 на GitHub: <https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/blob/ws8-03-uat/docs/qa/uat/2026-10-26/report.md> (локально — `docs/qa/uat/2026-10-26/report.md` у цій теці); термінал прогону — `docs/demo/ws8/03-uat/prod-run-terminal.txt` |
| 2 | **обов'язково** | `npx playwright show-report test-results/html` (зупинити — Ctrl+C) → AC-USERS-07 або AC-LEAVE-04 → відео (вшито «AC-… · Тоді: …») і Trace → вкладка aria | відео й траса є для кожного AC, не лише для впалих. Відео AC-USERS-11 на екран не виводимо: маску накладено лише на кадр-доказ, а у відео видно поле з посиланням для активації | відео — `docs/demo/ws8/03-uat/AC-USERS-07.webm`, `…/AC-LEAVE-04.webm`; HTML-звіт — `$S\planb\uat\run-prod-2026-10-26\html-report\index.html` (лише локально, траси з cookie в git не кладемо) |
| 3 | **обов'язково** | `code docs\qa\uat\2026-10-27\report.md` (попередній перегляд Markdown) | шапка: застосунок з комітом `/api/health` `a519424`; «Код тестів: `HEAD` @ `a519424`» (тека detached); прогін, рецензент, вартість; «Прибирання: синтетичних uat-*@example.test видалено 2, лишилось 0, заявок, що лишились: 0» — так очікується за кодом журналу з #37, повним прогоном не перевірено (у закоміченому звіті 26.10 — «видалено 0», бо журналу тоді ще не було); таблиця AC × перевірки × агент × підсумок × правило; кадр «Тоді»; цитати агента з позначкою «є на сторінці»; рядок «Рішення PM: ☐ приймаю · ☐ відхилення від вимог» | закомічений звіт 26.10 на GitHub (посилання — крок 1; локально — `docs/qa/uat/2026-10-26/report.md`): PASS 2, NEEDS-HUMAN 1, $0.0546 |
| 4 | **обов'язково** | Заготовлені контролі (не запускаємо): `docs/demo/ws8/03-uat/negative-controls/report.md` | NC-1 — у тесті навмисно хибний очікуваний текст: перевірка впала → **FAIL (R1)**, хоча Haiku сказав PASS — агент перевірку не перекриває. NC-2 — PM змінив текст «Тоді», а тест і застосунок ні: перевірки зелені, Haiku — NEEDS-HUMAN, Sonnet — FAIL → **NEEDS-HUMAN (R3)** | той самий файл; кадри — `…/negative-controls/frames/` |
| 5 | якщо є час | Слайди про D0: `npm run smoke -- https://quitcode-ws6-leave-portal-demo.vercel.app` | тепер (після злиття #34) — exit 0 за 2–4 с: `{… "root":307,"login":200,"health":{"status":200,"ok":true,"sha":"a5194242…","env":"production","db":"ok","reason":""}}` і `OK — прод живий, сторінка входу відкривається, база відповідає.` (26.10 ≈ 22:33; з `$sha` з передумови 2 — те саме). До злиття було exit 1: `"/api/health": 307 → /login — додайте "/api/health" у PUBLIC_PATHS (src/lib/supabase/proxy.ts)` — це історія й приклад, навіщо D0. На preview PR #34: `OK …` (`sha 2a41c33…`, `env preview`, `db ok`) | `…/03-uat/smoke-prod-before-merge.txt`, `…/smoke-preview-pr34.txt` |
| 6 | якщо є час | PR #34 → Checks → `e2e`: та сама специфікація в CI на одноразовому `supabase start` | зелений у 4 з 4 прогонів; 6 passed за ≈ 23 с, job ≈ 3 хв | <https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/actions/runs/40373586091> |

- **План lite** (повільний прод або репетиція): `npm run uat -- --url https://quitcode-ws6-leave-portal-demo.vercel.app --grep-invert '@writes'`
  — лише AC-USERS-07. Очікувано (26.10 ≈ 22:35, разом ≈ 26 с): `Running 4 tests`, `4 passed (14.2s)` (2 входи `setup`,
  AC-USERS-07, `cleanup`), `AC-USERS-07 [claude-haiku-5-5] → PASS`, `Звіт: docs/qa/uat/<дата>/report.md`, exit 0. Сам AC
  нічого не пише. Teardown `cleanup` усе одно запускається (ключ є в `.env.local`) і лише прибирає залишки `uat-*`:
  у `test-results\uat-cleanup.json` — `"deleted": []`, `"remaining": []`. Рядки `(node:…) Warning: The 'NO_COLOR' env is
  ignored…` бувають лише там, де задано `NO_COLOR` (термінал агента), і нешкідливі. Лапки навколо `'@writes'`
  обов'язкові: у PowerShell `@writes` без лапок —
  це оператор splatting, і Playwright отримає `--grep-invert` без значення (перевірено 26.10 у PowerShell 5.1: процес
  отримує лише `--grep-invert`).
- **Після будь-якого прогону-репетиції:** `report.mjs` пише в `docs/qa/uat/<дата прогону за Києвом>/` і спершу стирає
  там `frames/`. Прогін 26.10 потрапляє в теку закоміченого звіту, на якому стоїть План Б: `git restore docs/qa/uat/2026-10-26`
  (до відновлення `git status --short` показує ` D …/frames/AC-LEAVE-04-then-1.png`, ` D …/frames/AC-USERS-11-then-1.png`,
  ` M …/manifest.json`, ` M …/report.md`). Прогін 27.10 (репетиція за годину) потрапляє в теку живого прогону:
  `Remove-Item -Recurse -Force docs\qa\uat\2026-10-27`. Потім `git status --short` — порожньо: `.env.local`,
  `test-results/` і `playwright/.auth/` git ігнорує. Якщо в `docs/qa/uat/2026-10-26/` з'явилися нові файли (`??`), видаліть їх.
- **Без Claude:** `node scripts/uat/run.mjs --url https://quitcode-ws6-leave-portal-demo.vercel.app --skip-review` — звіт,
  де всі вердикти NEEDS-HUMAN (R2: немає вердикту агента). Пише в базу, як і крок 1; щоб лише читати, додайте
  `--grep-invert '@writes'`. 26.10 не запускали.
- **Розбір триває понад 2 хв:** Ctrl+C, показати закомічений звіт 26.10 і перейти до кроку 4. Якщо Ctrl+C припав на
  Playwright — одразу прибирання з розділу 7. Повторний розбір наявних кадрів без Playwright — `npm run uat:review`
  (це нові виклики моделі).
- **Прод недоступний:** закомічений звіт 26.10 + відео з `docs/demo/ws8/03-uat/`.

## 4. Демо 4 — два рецензенти на PR #33 (блок 04, ≈ 4 хв) — браузер; `lp-ws8-seeded` лише якщо є час

Обидва рев'ю заготовлено 26.10 на head `a390345`, з тим самим `AGENTS.md`. Як рахували: «знайшов» — коментар називає
саме цю ваду по суті; «хибна тривога» — твердження про ваду, якої немає; «заблокував» — рецензент вимагав змін.
Нижче — лише підсумок. Повна таблиця з цитатами по кожній ваді — `$S\planb\seeded\scorecard.md` (поза репо).

| | CodeRabbit | `/code-review high` |
|---|---|---|
| Знайшов | **4 з 7** | **7 з 7** |
| Пропустив | 3 | 0 |
| Хибні тривоги (зокрема на приманці) | 0 | 0 |
| Хибна порада | 1 | 0 |
| Заблокував | 0 (стан `COMMENTED`) | 0 (лише звіт) |
| Як запускали | `.coderabbit.yaml` з репо, профіль assertive; коментар `@coderabbitai review`, рев'ю за ≈ 6 хв | Claude Code 2.1.308, `claude -p "/code-review high 33" --setting-sources project`; рев'ю робив субагент на Claude Haiku 5.5: 92 с, $0,028 |

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | PR #33 → Files changed: 6 inline-коментарів CodeRabbit (перевірки pre-merge не тут: вони в коментарі-зведенні на вкладці Conversation, крок 3) | наприклад, `tests/leave/decisions.test.ts:17` — «Не пропускайте тест AC-LEAVE-07»; `src/lib/users/invite-link.ts:3` — джерело «Pipeline failures»: CodeRabbit прочитав вивід червоної детермінованої перевірки `check:boundary` | `docs/demo/ws8/04-review/pr33-coderabbit.md` — усі коментарі дослівно (read-only через `gh api`) |
| 2 | **обов'язково** | Таблиця (слайд) і одна знахідка `/code-review`, якої немає в CodeRabbit: «an exported "use server" function with no caller, so it adds a public POST endpoint» (`src/app/manage/actions.ts`). CodeRabbit розбирав цю дію як робочу фічу (помилка запиту, пагінація) і не помітив, що її ніхто не викликає. Цю ж ваду детерміновано ловить fallow (демо 1, крок 2) | — | `$S\planb\seeded\code-review.md` (поза репо) |
| 3 | **обов'язково** | Хибна порада CodeRabbit. PR #33 → Conversation → перший коментар CodeRabbit (зведення) → розгорнути «Pre-merge checks: 5 · 4» (за замовчуванням згорнуто; після перезавантаження сторінки знову згорнуто) → «Failed checks: 4 warnings» → рядок «Ac Id у тестах і матриці відповідності» (так CodeRabbit пише назву) → колонка Resolution. Таблиця широка: прокрутити праворуч або знайти Ctrl+F `toBe("approved")`. Перевірка помітила видалений `expect`, але запропонувала тест `toBe("approved")` для `["approved", "pending"]`. Такий тест закріпив би ваду. Він суперечить власному inline-коментарю CodeRabbit до `src/lib/leave/decisions.ts:35-41`: «Зберігайте `pending`, доки всі записи не схвалено» | пораду рецензента теж звіряємо з AC | `…/04-review/pr33-coderabbit.md`, розділ «Коментар-зведення» |
| 4 | якщо є час | Живий `/code-review` у терміналі 3 (команда нижче). Якщо є час — запускати на початку демо 4, ще до кроку 1: прогін іде ≈ 1 хв 50 с, поки в браузері йдуть кроки 1–3. Від запуску чекати не довше 2 хв | ≈ 90–110 с, ≈ $0,02–0,03, лише Claude Haiku 5.5; знахідки — JSON-масив у блоці коду. Репетиція 26.10 ≈ 22:33 у Windows PowerShell 5.1: 108 с, $0,024, 8 знахідок українською, усі 7 вад по суті, приманка без тривоги, advisor — 0, 5 відмов дозволів (рецензент їх обійшов). Мова, кількість і рядки знахідок між прогонами різняться: заготовлений прогін 17:37Z — англійською, 9 знахідок, `it.skip` на :17, а на репетиції — на :18. Один прогін — лише вибірка | `$S\planb\seeded\code-review.md` |

```powershell
Set-Location D:\projects\clients\quitcode\lp-ws8-seeded
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$raw = claude -p "/code-review high 33" --setting-sources project --output-format json --disallowedTools advisor --allowedTools Read Grep Glob "Bash(git diff:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(git fetch:*)" "Bash(git rev-parse:*)" "Bash(git merge-base:*)" "Bash(git status:*)" "Bash(git branch:*)" "Bash(gh pr view:*)" "Bash(gh pr diff:*)"
$r = $raw | ConvertFrom-Json
$r.result
'{0:N0} с · ${1:N3} · {2}' -f ($r.duration_ms / 1000), $r.total_cost_usd, (($r.modelUsage | Get-Member -MemberType NoteProperty).Name -join ', ')
```

Сама команда `claude -p …` — та сама, що в заготовленому прогоні 26.10 (17:37Z, Git Bash з `MSYS_NO_PATHCONV=1`; у
PowerShell він не потрібен). У Windows PowerShell 5.1 її перевірено 26.10 ≈ 22:33: exit 0, 108 с, $0,024, лише Haiku 5.5,
advisor — 0, `git status` у теці після прогону порожній. Обгортку (`$raw`, `ConvertFrom-Json`, `$r.result`) перевірено
на записаному виводі того прогону тим самим конвеєром PowerShell 5.1: кирилиця ціла, останній рядок —
`108 с · $0,024 · claude-haiku-5-5`. Без обгортки `--output-format json` друкує один рядок JSON ≈ 7 КБ, і знахідки в ньому —
рядок з екранованими `\n`: на сцені його не прочитати. `[Console]::OutputEncoding` потрібен, бо інакше PowerShell 5.1
(культура uk-UA) псує кирилицю у виводі, що йде в змінну. Якщо `ConvertFrom-Json` дасть помилку, сирий вивід лишається
в `$raw`. Термінал 3 — звичайний PowerShell, не термінал агента: змінні `CLAUDECODE`, `CLAUDE_CODE_*` і
`ANTHROPIC_BASE_URL` із сесії агента змінюють поведінку `claude -p`. `--setting-sources project` обов'язковий: з глобальними налаштуваннями субагент один раз радився з Opus
(прогін A: 192 с, $0,62, теж 7 з 7, але це не чисте порівняння, і в таблицю він не йде).

**Слайд 40 «Один файл правил — два рецензенти»: повторного прогону з правилом не заготовлено.** Показати лише текст
правила зі слайда й сказати, що цикл «пропуск → правило → повторний прогін» — завдання D домашки. Правило на слайді
закриває справжній пропуск CodeRabbit — ваду 6 (`grant update` на `email`): колонковий grant update на `profiles` — лише
`full_name`. Чому CodeRabbit її пропустив: його перевірка «Міграції: RLS, GRANT і політики» в `.coderabbit.yaml`
забороняє самозміну лише `role` і `status`. Два інші пропуски (невикликана Server Action і гілка `NODE_ENV === "test"`)
детерміновано ловить fallow, тож правило рецензенту для них не потрібне. `getSession()` знайшли обидва рецензенти: заборона
вже є в `AGENTS.md`.

**Слайд 42 «Eval скіла spec-review»: прогнано 26.10 ≈ 22:30, наживо не запускаємо.** Цикл `claude -p` (Claude Code
2.1.308, модель за замовчуванням — Haiku 5.5): 3 фікстури — вимога PM і сумлінний переклад в OpenSpec з однією
посадженою вадою (F1 — розмите «Тоді»; F2 — у матриці прав менеджер «—», а відмовного AC для менеджера немає; F3 — AC
без «Тоді»; `validate --strict` і `spec:check` зелені на всіх трьох) × 3 прогони, лише зі скілом. Результат — **8 з 9**:
F1 3 з 3, F2 2 з 3, F3 3 з 3; 40–70 с і ≈ $0,014 на прогін, 9 прогонів — $0,12 (ціни API). Грейдер — код, критерії
записано до прогонів; ручне читання всіх 9 звітів збіглося з грейдером. Пілотний прогін F2 (у недовіреній теці
`claude -p` ігнорує `permissions.allow` проєкту, тож правила потім передавали через `--allowedTools`) теж промахнувся й
у підрахунок не входить. Δ «без скіла» не міряли — так і кажемо. Фікстури, грейдер і вивід — `$S\skill-eval` (поза
репо).

## 5. Очікувані результати (довідка)

| Тег / ref | `npm test` | `ac:coverage` | Покриття рядків `src/**` | Stryker (505 мутантів) | Мутації SQL (11) | CI |
|---|---|---|---|---|---|---|
| `ws8-00-baseline` | 119 passed (14 файлів; 25 тестів бази) | OK: 17 AC у вимогах PM, 28 у специфікаціях, «реалізовано» 27, у назвах тестів 27 | 32,01 % (146/456; виміряно на `ws8-01-gates` — ті самі тести) | 80,59 % (406 вбито / 1 timeout / 58 вижило / 40 без покриття; тести бази на коді `ws8-02-tests`) | 6 з 11; вижили L2, L4, L5, L7; L6 еквівалентний | — |
| `ws8-01-gates` | 119 passed | OK | 32,01 % | — | — | у CI не запускався; з чистого `npm ci` локально (`CI=true`) lint, typecheck, test, test:coverage, build — exit 0 |
| `ws8-02-tests` | 127 passed (30 тестів бази, зелені за 5 seed перемішування) | OK | 32,01 % | 81,98 % (413 / 1 / 51 / 40); calendar.ts 93,33 → 100, password.ts 80,56 → 86,11, roles.ts 70,37 → 75,93 | 10 з 11 + L6 | PR #35: 13 pass, `db-deploy` skipped |
| `ws8-03-uat` | 125 passed (+2 тести `ac:coverage` для e2e, +4 тести класифікації `/api/health`) | OK, «реалізовано» 28 з 28 (AC-USERS-11 — e2e) | — | — | — | PR #34: обов'язкові pass, `e2e` pass; GitGuardian fail (хибна тривога) |
| PR #33 `a390345` | 118 passed, 1 skipped (119) | OK (28 AC, «реалізовано» 27) | — | `fallow mutation` на `decisions.ts`: 96,4 % на базі → 84,6 % | — | обов'язкові pass; «Секретний ключ лише на сервері» fail |

`npm run build` на `ws8-03-uat` показує `ƒ /api/health` і `ƒ Proxy (Middleware)`. Час (Windows, Node 24.18): `npm ci`
≈ 23 с; lint 6,8 с без `.next`; typecheck 3–4 с; `npm test` ≈ 9 с; build 7 с; повний Stryker 13,7 с; `mutation:sql`
(11 мутантів) 21,5 с; `fallow audit` 1–2 с (зі стартом `npx` — 2–3 с); `npm run gates` 10–30 с; `npm run uat` на проді 1 хв 07 с; «План lite» ≈ 26 с (Playwright 14,2 с, Haiku 9,6 с); `npm run smoke` 2–4 с; лише
прибирання ≈ 2 с; живий `/code-review` у PowerShell 5.1 — 108 с.

## 6. Що не вдалося, не заготовлено або відрізняється від колоди

### Не вдалося або червоне

1. **AC-LEAVE-04 в UAT — NEEDS-HUMAN** на справжньому прогоні 26.10 (і Haiku, і Sonnet): тире чи дефіс — з кадру не
   видно. Можливе виправлення (не застосовано): прибрати точні символи діапазону з `visible` і перевіряти їх у `hidden`.
2. **GitGuardian червоний на PR #34** — хибна тривога в коміті `daf6190` (incident 39056826): рядок `e2e.yml`, що
   генерував пароль у раннері. Його переписано в `25d5af7`, але переписувати історію гілки не дозволено. Позначте
   інцидент як false positive у дашборді GitGuardian. Перевірка не обов'язкова.
3. **`npm run gates` без `--base`** (на `ws8-01-gates` і `ws8-02-tests`). Після `git push -u` fallow порівнює з upstream
   гілки, пише `Audit scope: 0 changed files` і завжди зелений. Виправлення — `"gates": "npm run lint && npm run
   typecheck && fallow audit --base origin/main"` у `package.json`; на `main` його внесено в PR #37 (`23de82e`), у теги — ні (amend і перенесення тегів
   заборонено). На сцені — завжди `-- --base ws8-00-baseline`. CI це не зачіпає: `quality.yml` передає базу явно.
   У `materials/` домашки база теж має бути явною.
4. **`/api/health` на проді — 307** до злиття #34, тож `npm run smoke` на проді дає exit 1. Тригери `smoke.yml`
   (`status`, `repository_dispatch`, `schedule`) працюють лише з гілки за замовчуванням, тобто перевіряються після
   злиття. Чи приходить `repository_dispatch` від Vercel і з яким `client_payload.environment` — не перевірено.
5. **CodeRabbit пропустив 3 з 7 і дав 1 хибну пораду.** Ліміт — 1 рев'ю на годину.
6. **`/code-review`, прогін A** (глобальні налаштування) змішаний із порадником Opus — показуємо окремо, не для порівняння.
7. **`check:boundary` червоний на PR #33** — так задумано.
8. **`manifest.json` UAT несумісний із `check-recordings` WS9:** відео не в git, а гейт читає лише `asserted` і
   `vision.met`. Потрібен адаптер або відео в репо на кожен AC.
9. **Шапка закоміченого звіту UAT** каже «код тестів `daf6190`». Насправді звіт згенеровано з `daf6190` разом із тоді ще
   не закоміченими `scripts/uat` і виправленням лічильника «Тоді» (закомічено в `25d5af7`); опис PR #34 це розкриває.

### Не заготовлено

- Повторний прогін `/code-review` з новим правилом (`[[DEMO:review-rule-rerun]]`).
- Eval скіла `spec-review` без скіла (Δ): прогнано лише плече «зі скілом» (розділ 4).
- Запис «`next build` зелений, `next start` падає на конфлікті маршрутів»: такої вади в PR #33 немає. Лог спайку
  23.10 на next 16.4.0 у `$S` не збережено (шляху `$S\spikes\gates\seeds-out\start-s4.log` немає). На сцені не згадувати.
- Відео AC-USERS-11 у репо не кладемо (у полі на відео може бути `token_hash`): `$S\planb\uat\run-prod-2026-10-26\videos\AC-USERS-11.webm`.

### Колода ↔ RUNBOOK (RUNBOOK має пріоритет)

| Слайд | У колоді | Насправді / що робити |
|---|---|---|
| Демо 1, крок 2 | `npx fallow audit --base main` → verdict fail | У гілці PR конфігу воріт немає: без нього fallow дає лише попередження й exit 0. Fail (exit 1) — з конфігом із `ws8-01-gates` (передумова 8) і `--base ws8-00-baseline --no-cache`. `--base main` не брати: після злиття #34/#35 `main` зсунеться |
| Демо 1, картка «на що дивимось» | `it.skip`, мінус один assert, гілка «лише для тестів»; конфлікт маршрутів; невикликана Server Action | Конфлікту маршрутів і циклу імпортів у PR #33 немає: там 7 вад + 1 приманка (вада з конфліктом маршрутів ламала б preview, а він ходить у прод-Supabase). Diff risk: `it.skip`, мінус один assert, `NODE_ENV === "test"`; Policy: невикликана Server Action |
| Демо 1, крок 3 | Чи є ESLint WS8 на гілці — вирішує RUNBOOK | На гілці його немає → обов'язковий CI зелений. Локально з конфігом із `ws8-01-gates`: `17:6 … vitest/no-disabled-tests`; `npm run lint` — 2 помилки (ще успадкована `submission.test.ts:35`) |
| Демо 1, крок 4 | `git switch main && npx fallow audit --base main` | `main` проти `main` — порожньо. Замість цього `ws8-01-gates` проти `ws8-00-baseline` → `✓ No issues in 10 changed files` |
| Демо 1, «якщо є час» | запис `next build` / `next start` | не заготовлено (вище) |
| Нотатки слайда з вадами; план | синхронізовано 26.10: «7 вад + приманка» | — |
| Демо 2, крок 2 | `npx vitest run --config vitest.coverage.config.mts --coverage` | На `ws8-00-baseline` цього конфігу немає → `npx vitest run --coverage.enabled --coverage.include=src/lib/leave/calendar.ts` |
| Демо 2, кроки 5 і 7 | `npx stryker run --mutate …` двічі | На базовому тегу конфігу Stryker немає → `--testRunner vitest … --reporters clear-text,html`; другий прогін — на `ws8-02-tests`: `npm run mutation:ts -- --mutate src/lib/leave/calendar.ts` |
| Демо 2, крок 6 | кейси пишемо (або агентом) | Кейси вже на тезі `ws8-02-tests` → перемикаємось і показуємо рядки 35–46 |
| «Мутації SQL» | «спайк, до тестів: 6/11 · ≈ 27 с» | На тегах демо: 6 з 11 → 10 з 11 + L6, повний прогін ≈ 21 с; на сцені — `--only L2,L5`: 0 з 2 → 2 з 2, ≈ 5,5 с кожен |
| Демо 3, термінал слайда 29 | `code docs/qa/uat/2026-10-26/report.md` (записаний прогін) | наживо — `code docs\qa\uat\2026-10-27\report.md`; `2026-10-26` — закомічений звіт (План Б) |
| Демо 3, негативні контролі (слайд 29) | синхронізовано 26.10: «заготовлено 26.10», наживо не запускаємо | заготовлений `docs/demo/ws8/03-uat/negative-controls/report.md` (крок 4) |
| Демо 3, тека (слайд 29) | тег `ws8-03-uat` | `lp-ws8-uat` — на `main` `a519424` (передумова 7): `tests/e2e/` ті самі, що на тезі; відрізняється лише `scripts/uat/run.mjs` (журнал прибирання за прогін, #37) |
| «Дані на проді» (слайд 30) | синхронізовано 26.10: `--grep-invert '@writes'` у лапках | у PowerShell — лише в лапках (розділ 3, «План lite») |
| «Один файл правил» (слайд 40) | синхронізовано 26.10: правило під пропуск D6 (grant на `email`), «на демо цей цикл ще не проганяли» | так і показуємо; повторного прогону немає (розділ 4) |
| «Eval скіла spec-review» (слайд 42) | 8 з 9, цикл `claude -p` 26.10 | так і є: прогнано 26.10, лише зі скілом; Δ «без скіла» не міряли (розділ 4) |
| Матриця «вада × шар» (слайд 39) | синхронізовано 26.10: 7 вад PR #33 + приманка | клітинка в клітинку збігається з матрицею в `scorecard.md`; цитати рецензентів — лише в `scorecard.md` поза репо |

**Значення для токенів `[[DEMO:…]]`** — історія: у колоді токенів уже немає, усі значення підставлено 26.10 (лише з цих
прогонів):

| Токен | Значення |
|---|---|
| `seeded-pr` | `#33` |
| `gates-ci-green` | `spec, app, conformance, db-check — pass` (необов'язковий «Секретний ключ лише на сервері» — fail) |
| `gates-audit-verdict` | `✗ dead code: 1 issue · diff risk: 3 findings · 9 changed files` (exit 1, з конфігом із `ws8-01-gates`) |
| `gates-eslint-cmd` | `npx eslint tests/leave/decisions.test.ts` (з `eslint.config.mjs` із `ws8-01-gates`) |
| `gates-eslint-result` | `17:6  error  Disabled test … vitest/no-disabled-tests` |
| `gates-audit-main` | `✓ No issues in 10 changed files` (`ws8-01-gates` проти `ws8-00-baseline`) |
| `tests-ac-coverage` | `OK — «реалізовано» 27, AC у назвах тестів 27` |
| `tests-calendar-coverage` | `100 \| 100 \| 100 \| 100` |
| `tests-planted-green` | `Tests  119 passed (119)` |
| `tests-stryker-before` | `93.33 % · 28 killed · 2 survived (calendar.ts:14:38)` |
| `tests-stryker-after` | `100 % · 30 killed · 0 survived` |
| `tests-sql-mutants` | `--only L2,L5: до 0 з 2 → після 2 з 2` |
| `uat-run` | `6 passed (39.6s)` (26.10) |
| `uat-verdicts` | `AC-USERS-11 PASS · AC-USERS-07 PASS · AC-LEAVE-04 NEEDS-HUMAN` |
| `uat-date` | `2026-10-27` наживо; `2026-10-26` — закомічений звіт |
| `review-cr-found` / `-missed` / `-fp` | `4` / `3` / `0` (з 7) |
| `review-cc-found` / `-missed` / `-fp` | `7` / `0` / `0` (з 7) |
| `review-cc-quote` | `an exported "use server" function with no caller, so it adds a public POST endpoint` |
| `review-missed` | не `getSession` — див. розділ 4 і `scorecard.md` поза репо |
| `review-rule-rerun` | не заготовлено |
| `skill-eval-cmd`, `skill-eval-pass-rate` | цикл `claude -p` · 8 з 9 (слайд 42; розділ 4) |

## 7. Прибирання після заняття

- **Користувачі `uat-*`.** Прогін прибирає за собою сам; перевірка — `lp-ws8-uat\test-results\uat-cleanup.json`:
  `"remaining": []`, `"leftoverRequests": 0`. Якщо прогін обірвався (Ctrl+C), запустіть лише прибирання:

  ```powershell
  Set-Location D:\projects\clients\quitcode\lp-ws8-uat
  $env:UAT_BASE_URL = 'https://quitcode-ws6-leave-portal-demo.vercel.app'
  npx playwright test --project=cleanup
  Remove-Item Env:UAT_BASE_URL
  ```

  Очікувано `1 passed`, а в `uat-cleanup.json` — `remaining: []` і `leftoverRequests: 0`. Supabase → Authentication →
  Users: лише 5 базових користувачів (`admin@`, `manager.math@`, `manager.primary@`, `teacher@`, `teacher2@example.test`),
  жодного `uat-*`; у черзі менеджера MATH немає заявок `uat-*`.
- **`lp-ws8-uat`:** живі сесії й секрети прибрати до видалення теки: `Remove-Item -Recurse -Force playwright\.auth, test-results`
  і `Remove-Item .env.local`. Звіт `docs\qa\uat\2026-10-27\` лишити як доказ або видалити. Комітити з нього можна
  лише `report.md`, `manifest.json` і `frames/`, без відео й трас. Якщо прогін був 26.10 (репетиція), то
  `git restore docs/qa/uat/2026-10-26`.
- **`lp-ws8-quality`:** `git checkout -- src/lib/leave/calendar.ts` і `git restore --source=HEAD -- tests/`. Якщо тека
  на PR #33 — ще `git checkout a390345 -- eslint.config.mjs` і `Remove-Item .fallowrc.jsonc`. Потім
  `Remove-Item -Recurse -Force reports, coverage, .stryker-tmp, .fallow -ErrorAction SilentlyContinue`;
  `git status --short` — порожньо.
- **Теки:** коли вони більше не потрібні, з основної теки — `git worktree remove --force ..\lp-ws8-quality` (так само
  `lp-ws8-uat` і `lp-ws8-seeded`).
- **PR #33 не зливати ніколи.** Після заняття — на ваш розсуд: опублікувати таблицю рецензентів коментарем у #33
  (`$S\planb\seeded\scorecard.md`; до демо її не публікуємо, бо це ключ відповідей) і закрити PR.
- **PR #34 і #35 злито 26.10.** На `main` `a519424` зелені `e2e` і `quality`, тож тепер можна зробити обов'язковими `e2e`,
  «Ворота: fallow audit» і «Покриття: доменна підлога» (`npm audit` — ніколи).
- Не зберігати запис екрана, де без маски видно поле з посиланням для активації.

## 8. Докази в `docs/demo/ws8/`

Усе нижче — справжній вивід 26.10.2026. Відео лише менше 5 МБ і без посилань для активації. Траси, HTML-звіт Playwright і
`.env*` сюди не потрапляють. Перед комітом набір перевірено пошуком на JWT, `token_hash`, ключі Supabase й паролі:
збігів немає (крім назв тестів зі словом `token_hash`).

| Тека | Що |
|---|---|
| `01-gates/` | `gh pr checks` для #33, #34, #35 (26.10 18:16Z); `fallow audit` на PR #33 без конфігу та з конфігом із `ws8-01-gates`; ESLint WS8 на PR #33 (один файл і весь репо); `check:boundary` на PR #33; `fallow audit` на `ws8-01-gates`; `npm run gates -- --base ws8-00-baseline` на `ws8-02-tests` |
| `02-tests/` | скріншоти покриття й Stryker (`screenshots/01…06`); вивід кроків живого демо (`live-demo/01…08`, HTML покриття `calendar.ts` з дефектом, HTML Stryker до й після); мутації SQL і точкові TS-мутанти до й після; доказ виправлень `mutation-check.mjs`; повний Stryker до й після (текст); підсумок покриття; `fallow mutation` на `decisions.ts` PR #33 і бази |
| `03-uat/` | термінал прогону на проді 26.10 (`prod-run-terminal.txt`) і `prod-run-uat-cleanup.json`; відео AC-USERS-07 і AC-LEAVE-04; негативні контролі (звіт, кадри, термінал); smoke проду до злиття #34 і preview PR #34 |
| `04-review/` | коментарі CodeRabbit на PR #33 дослівно (вони й так публічні в PR); smoke preview PR #33 (лише GET) |

Звідки знімки:
- `01-gates/` — знято 26.10 увечері у Windows PowerShell 5.1, крім `pr33-fallow-audit-zero-config.txt` і
  `pr33-check-boundary.txt` (Git Bash, того ж дня).
- `02-tests/live-demo/08…` — PowerShell 5.1.
- Решта `02-tests/` — Git Bash, того ж дня. У PowerShell 5.1 повторено кроки 1–8 демо 2 (покриття — лише HTML: термінал
  агента ховає рядок зі 100 %), `--only L2,L5` до й після, T1/T2 після і `fallow mutation` на PR #33. Числа ті самі.
  Повний Stryker, повний `mutation:sql` і скріншоти в PowerShell не повторювали.

Звіт і кадри UAT з проду в цю теку не дублюємо: вони закомічені на тезі `ws8-03-uat` (`docs/qa/uat/2026-10-26/`).

У копії HTML-звіту покриття (`02-tests/live-demo/coverage-baseline-bug-calendar/`) немає `block-navigation.js` (навігації
клавішами). Його невикористана директива `eslint-disable` давала попередження, і `npm run lint` з `--max-warnings 0`
червонив би обов'язковий `app`. Підсвітка рядків від цього не залежить.
