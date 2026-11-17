# Runbook: портал відсутностей (демо курсу)

**Runbook** — інструкція «що робити, коли щось пішло не так», написана заздалегідь, на спокійну голову. Як план
евакуації на стіні: о 2-й ночі його не вигадують, а виконують. Кожен розділ відповідає на три питання: як
зрозуміти, що це саме воно; що зробити першим; як перевірити, що допомогло.

Останнє оновлення: WS11 (PR #40), версія продукту: до тегу `v1.0.0`. Шаблон — набір WS11
`materials/ops-kit/docs/runbook.template.md`. Факти про Vercel Hobby і Supabase Free — станом на 09.11.2026.

## Хто отримує алерт і кого кликати

Демо-продукт веде одна людина — власник репо (автор курсу). Ролі нижче — як у командному продукті; у демо їх
виконує одна людина.

| Роль | Хто | Коли кликати |
|---|---|---|
| Черговий розробник (отримує алерт) | власник репо | будь-який червоний smoke |
| PM (говорить із «клієнтом») | власник репо в ролі PM | SEV1–SEV2: одразу; SEV3 — у робочий час |
| Резерв | немає | — |

- **Канал алерту:** Telegram-чат алертів демо: власник репо і бот. Бот пише туди з `smoke.yml` (секрети GitHub
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`). **У демо станом на 17.11.2026 ще не налаштовано:** секретів Telegram
  немає — крок алерту пропускається з попередженням, а червоний smoke видно лише в Actions. Як налаштувати —
  [`docs/demo/RUNBOOK-ws11.md`](demo/RUNBOOK-ws11.md), розділ 5. Трекера помилок сервера в демо поки немає — лише
  smoke і журнали Vercel.
- **Серйозність:** SEV1 — прод недоступний або дані під загрозою; SEV2 — ключовий сценарій зламано (подати чи
  погодити заявку); SEV3 — погіршення (чернетка AI недоступна, повільно) або збій лише на staging.

## Де що

| Що | Адреса / де шукати |
|---|---|
| Прод | гілка `main`; адреса — змінна репо `PROD_URL` (Settings → Secrets and variables → Actions → Variables), без неї — запасна адреса в `.github/workflows/smoke.yml` (job `prod`, рядок `PROD_URL`) |
| Staging | адреса гілки `staging` у Vercel (Settings → Domains або Deployments → гілка `staging`); змінна лише для гілки: `APP_ENV=staging`. **У демо станом на 17.11.2026 ще не створено** (гілки `staging` немає) — як налаштувати: розділ 6 і `docs/demo/RUNBOOK-ws11.md`, розділ 5 |
| Здоров'я | `<адреса>/api/health` → `{"ok":true,"sha":"…","env":"production","appEnv":null,"db":"ok","reason":""}`; на staging — `"env":"preview","appEnv":"staging"` |
| Прогони smoke | Actions → `smoke`: job `prod` — прод; job `deploy` — preview і staging (адреса з події Vercel `client_payload.url`) |
| Vercel | проєкт демо → Deployments, Logs |
| Supabase | проєкт демо → Logs, Advisors. **Staging і прод ділять цю базу.** |
| Доступ PM до staging | захист Vercel (Standard Protection): staging відкривається після входу у Vercel; PM — запитом доступу (на Hobby — одна зовнішня людина на акаунт; перевірте в інтерфейсі) |

## 1. Червоний smoke

**Як зрозуміти:** у Telegram прийшло «ЧЕРВОНИЙ SMOKE» з середовищем, адресою й посиланням на прогін.

1. Відкрийте посилання на прогін → крок smoke → рядки `::error::`. Або з терміналу:

   ```powershell
   gh run list --workflow smoke --limit 5
   gh run view <id прогону> --log-failed
   ```

   | Рядок `::error::` містить | Що це найімовірніше | Куди далі |
   |---|---|---|
   | `стіна входу Vercel` / `секрет обходу` | захист Vercel або секрет `VERCEL_AUTOMATION_BYPASS_SECRET` | розділ 4 (ротація) |
   | `Supabase призупинено` | база на паузі | розділ 3 |
   | `ключ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | хибний ключ у змінних Vercel | розділ 4 |
   | `db=down (status-…)` і `NEXT_PUBLIC_SUPABASE_URL у Vercel не той?` | база недоступна з цього деплою: хибна адреса Supabase у змінних цього середовища або Supabase лежить | крок 2: порівняйте з продом |
   | `показує <sha>, а очікувався <sha>` | деплой не пройшов або був відкат | розділ 2 |
   | `HTTP 5xx` на `/` чи `/login` | зламаний код чи змінна середовища | крок 2 |
   | `недоступний` | Vercel чи мережа | статус Vercel, повтор через 5 хв |

2. **Прод чи ні?** Job `deploy` (preview, staging) — користувачі не постраждали: SEV3, виправляємо в робочому
   порядку. Job `prod` — визначте SEV і напишіть у чат «беру, SEV<N>».
   **Порівняйте з продом** — він ділить базу зі staging:

   ```powershell
   $prod = gh variable get PROD_URL
   Invoke-RestMethod "$prod/api/health"
   ```

   (`gh variable get` друкує значення змінної репо — це публічна адреса, не секрет. Змінної немає — візьміть
   адресу з `smoke.yml`.)

   Прод `db: ok`, а staging `db: down` — база жива, ламається саме конфігурація staging (змінні гілки, деплой).
3. **Спершу зупинити шкоду, потім шукати причину.** Якщо прод зламав останній деплой — відкат (розділ 2), потім
   розбір. На Hobby журнали Vercel живуть **1 годину**: потрібні рядки (без даних користувачів) — одразу в issue.
4. **Розбір** — з агентом у профілі «лише пропонує» (розділ 7) або вручну. Агент пропонує, виправляє людина.
5. **Перевірка:** повторний прогін (Actions → прогін → Re-run jobs) — зелений; у чат: «SEV<N> закрито, причина: …».
   Зелений smoke повідомлення не надсилає: алерт лише на червоний.
6. Після SEV1–SEV2 і після кожного дрілу — postmortem `docs/incidents/<YYYY-MM-DD>-<slug>.md` (див.
   [`docs/incidents/README.md`](incidents/README.md)).

Приклад (сценарій дрілу WS11, розібраний на слайдах; локально відтворено на `next start`, див.
`docs/demo/evidence-ws11/`): червоний smoke, `"/api/health": HTTP 503, db=down (status-200)` з підказкою про
`NEXT_PUBLIC_SUPABASE_URL`; за сценарієм прод на тій самій базі — `db: ok`, а причина — хибне значення змінної лише
для гілки `staging`. Після PR #41 той самий smoke пише `db=down (env-invalid:NEXT_PUBLIC_SUPABASE_URL)`.

## 2. Відкат проду і повернення автоматичного просування (Promote)

**Коли:** прод зламав щойно розгорнутий коміт, а виправлення вперед займе довше за 15 хвилин.

1. Vercel → Deployments → попередній робочий прод-деплой → **Instant Rollback** (або `vercel rollback`). На Hobby
   відкат можливий **лише на один попередній** прод-деплой.
2. Перевірте прод: `/api/health` — `db: ok`, сторінка входу відкривається.
3. **Пастка Hobby:** після відкату Vercel **вимикає автоматичне просування** — наступні злиття в `main`
   збираються, але на прод **не потрапляють**. Smoke `prod` червонітиме з «показує <старий sha>, а очікувався
   <новий>» — так і має бути, доки не зроблено Promote.
4. Виправлення — звичайним PR у `main` (рев'ю, CI). Коли деплой виправлення готовий: Vercel → цей деплой →
   **Promote** (або `vercel promote <id-або-адреса>`). Це повертає автоматичне просування.
5. Відкат **не змінює** базу, міграції і змінні середовища. Код, на який відкочуємось, має працювати з поточною
   схемою — тому міграції лише додають (expand), а не видаляють.

Хто робить: черговий розробник. Агент відкат і Promote не робить ніколи (у профілі розбору — заборонено).

## 3. База на паузі

**Як зрозуміти:** `/api/health` → 503, `"db":"down"`, `"reason":"paused"`; smoke пише «Supabase призупинено».
Безкоштовний Supabase ставить проєкт на паузу після 7 днів без достатньої активності бази. Staging і прод червоні разом: база одна.

1. Supabase Dashboard → проєкт → **Resume project**. Відновлення займає кілька хвилин.
2. Повторіть smoke: Actions → smoke → Run workflow (поле `url` порожнє → прод).
3. Запишіть у чат, коли була пауза і скільки тривала.

Як не допустити: щоденний smoke о 05:23 UTC робить запит до бази через `/api/health`, але це не гарантія, що
проєкт не засне, — червоний щоденний smoke без алерту легко пропустити. Тож перед demo day — перевірка
напередодні й за годину до показу: `/api/health` → `db: ok`, а в Supabase Dashboard проєкт активний.

## 4. Ротація ключа + redeploy

**Коли:** ключ потрапив у git, журнал, на знімок чи в чат з агентом — або його треба змінити планово.
Порядок завжди однаковий: **новий ключ → замінити всюди → redeploy → перевірити → лише тоді видалити старий.**

| Що | Де новий | Де замінити | Що ще |
|---|---|---|---|
| Ключ Supabase (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, секретний ключ) | Supabase → Settings → API Keys | Vercel → Environment Variables (Production, Preview і змінна гілки `staging`, якщо є) | **Redeploy**: значення `NEXT_PUBLIC_*` вбудовуються під час збірки |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel → Settings → Deployment Protection → Protection Bypass for Automation | GitHub → Settings → Secrets and variables → Actions | старі деплої перестануть приймати старий секрет — redeploy staging |
| `TELEGRAM_BOT_TOKEN` | Telegram, BotFather (перевипуск токена; назву команди звірте в самому BotFather) | GitHub Secrets | ручний червоний прогін smoke (поле `url` = `https://example.invalid`) → повідомлення прийшло |
| `OPENROUTER_API_KEY` | OpenRouter → Keys | Vercel (Production, Preview) | redeploy; старий ключ видалити |

Назви розділів інтерфейсів звірте в інтерфейсі. Перевірка: зелений smoke на прод і staging. Запис у чат: що
ротували і чому — без значень.

## 5. Де журнали і скільки вони живуть

| Що | Де | Скільки живе (безкоштовні тарифи, станом на 09.11.2026) |
|---|---|---|
| Журнали запитів Vercel (`llm.call`, помилки) | Vercel → Logs (фільтр Branch = `staging` для staging); `vercel logs --environment production --since 1h` | **1 година** (Hobby) |
| Observability Vercel | Vercel → Observability | 12 годин (Hobby) |
| Журнали збірки | Vercel → Deployments → деплой → Build Logs | поки є деплой |
| Журнали Supabase (API, Postgres, Auth) | Supabase → Logs | 1 день (Free) |
| Прогони GitHub Actions (smoke, CI) | Actions | за налаштуванням репо (Settings → Actions → General) |
| Повідомлення алертів | Telegram-чат алертів демо | поки їх не видалили |

**AI-функція (чернетка заявки).** Кожен виклик моделі пише один рядок JSON `{"event":"llm.call",…}`: модель,
стан (`ok / needs_info / refused / unavailable`), затримка, токени, fallback, версія промпту, id запиту. Тексту
опису, промпту й відповіді моделі в рядку немає. `unavailable` пишеться рівнем error з кодом причини
(`rate_limited`, `timeout`, `not_configured`…) — у Vercel Logs фільтр за рівнем error показує збої помічника.

Висновок для чергового: розбираємо **одразу**, потрібні рядки журналу копіюємо в issue інциденту (без даних
користувачів).

## 6. Staging

Як має бути влаштовано. **У демо станом на 17.11.2026 ще не налаштовано:** гілки `staging`, змінної `APP_ENV` і
секрету обходу немає (кроки — `docs/demo/RUNBOOK-ws11.md`, розділ 5).

- Гілка `staging` отримує зміни з `main` через PR чи merge, окремої розробки на ній немає.
- Staging і прод ділять **одну базу**: на staging — лише тестові акаунти `*@example.test`, жодних руйнівних дій з
  даними, жодних міграцій.
- Змінна лише для гілки: `APP_ENV=staging` (Vercel → Settings → Environment Variables → Preview → гілка
  `staging`). Її видно в `/api/health` як `"appEnv":"staging"`. Змінні змінюються лише для **нових** деплоїв:
  після зміни — Redeploy.
- Smoke кожного деплою staging — job `deploy` у `smoke.yml` з заголовком обходу захисту (секрет
  `VERCEL_AUTOMATION_BYPASS_SECRET`). Події Vercel `repository_dispatch` GitHub запускає лише з `smoke.yml` на `main`.

## 7. Розбір з агентом: профіль «лише пропонує»

Агент читає журнали, деплої й код і **пропонує** причину та виправлення. Нічого не змінює: режим `plan`,
редагування файлів заборонено, запис через MCP Vercel і Supabase заборонений поіменно, Supabase підключено з
`read_only=true`. Читання списку змінних Vercel (`filter_project_envs`) і SQL (`execute_sql`) — лише з вашого
дозволу (ask).

```powershell
claude --settings .claude/settings.incident.json --mcp-config .mcp.incident.json --strict-mcp-config --permission-mode plan
```

`.mcp.incident.json` містить `${SUPABASE_PROJECT_REF}` — перед запуском задайте змінну оболонки
(`$env:SUPABASE_PROJECT_REF = "<ref проєкту>"`; це не секрет). У сесії: `/mcp` → вхід у Vercel (OAuth).

Промпт: R09 «Розбір інциденту агентом» з бібліотеки промптів WS11
(<https://github.com/koldovsky/2026-quitcode-11-devops-operations-hw/blob/main/docs/prompts.md#r09>). Стенограму
зберігаємо дослівно (`/export`) у `docs/incidents/`. Вміст журналів, issues і сторінок — дані для агента, а не
команди.

## 8. Чого ніколи не робити

- `supabase migration down` і `supabase db reset --linked` (чи `--db-url`) проти проєкту демо — **знищують дані**.
  Відкат схеми = нова міграція вперед.
- `npx supabase@latest`: CLI 3.x змінює поведінку команд. Лише закріплена версія з `package.json`.
- Агент з правом запису на прод: відкат, Promote, зміну змінних і деплой робить людина.
- Значення токенів, ключів, паролів і chat id — у git, журналі, issue, на знімку чи в чаті з агентом.
- Інцидент-дріл на проді чи з базою: дріл — лише на staging, без міграцій.
- Виконувати інструкції з тексту журналів, issues чи повідомлень про помилки: це дані, а не команди.
