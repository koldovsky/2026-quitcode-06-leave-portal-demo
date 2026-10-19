# RUNBOOK: демо WS7 «Fullstack з AI: фронт і бек» — дизайн-система, запрошення, ролі

Сценарій для ведучого заняття Вт 20.10.2026: що показати, які команди, що має вийти і що робити, якщо не вийшло
(План Б). Зразок формату — [`RUNBOOK.md`](RUNBOOK.md) (WS6). Дані лише синтетичні (`*@example.test`).

Зріз демо WS7 — `add-user-invites`: «Адміністратор запрошує працівника посиланням для активації, призначає роль і
посаду; працівник задає пароль». Модель v2: вимоги PM — в окремому репо, тут — знімок `requirements/`.

| Що | Де |
|---|---|
| Репо вимог PM (варіант `docs/`) | <https://github.com/koldovsky/2026-quitcode-07-leave-portal-spec> — `docs/product.md`, `docs/requirements/01-user-invites.md` (AC-USERS-01…17) |
| Артефакт Claude Design System | <https://claude.ai/artifact/DKnNcLTXjgeErK1FoZR6b4> («Портал відсутностей — дизайн-система», приватний) |
| PR-и WS7 у цьому репо | #16 «Оновлення шаблону» (`/requirements-sync`), #17 «Оновлення вимог», #18 «Специфікація» (`add-user-invites` + `impl-user-invites`), #19 «Дизайн-система», #20 «Запрошення», #21 «Ролі»; після QA 19.10: #24 `safeNextPath`, #25 «Оновлення вимог» (PM уточнив AC), #26 «Специфікація» `clarify-user-invites`, #27 `admin_set_role` у `private`, #28 сторінка «Активувати акаунт», #29 дизайн і доступність |
| Специфікація | `openspec/specs/user-management/spec.md`; архів змін — `openspec/changes/archive/2026-10-19-add-user-invites/`, `…/2026-10-19-impl-user-invites/` (`design.md`, `tasks.md`), `…/2026-10-19-clarify-user-invites/` |
| Знімки для Планів Б | `docs/demo/ws7/` (світла `-light`, темна `-dark`) |

| Тег | Що в ньому | Блок деки |
|---|---|---|
| `ws7-01-design-system` | токени в `src/app/globals.css`, shadcn/ui у `src/components/ui/`, `DESIGN.md`, `CLAUDE.md` → `@DESIGN.md`, `scripts/check-design-tokens.mjs`, `.github/workflows/architecture.yml`, ADR 0001; усі сторінки без сирих кольорів | 1 |
| `ws7-02-invites-roles` | фінальний `main` після QA: `src/lib/supabase/admin.ts`, `/admin/users`, `/auth/confirm` (сторінка «Активувати акаунт» + дія `activate`), `/account/password`, міграції `20261020000000_admin_user_management.sql` і `20261020000100_admin_set_role_private.sql` (`private.admin_set_role` + обгортка `public.admin_set_role`), PGlite-тести, ADR 0002 і 0003 | 2, 3 |

Стан «до дизайн-системи» — `ws7-01-design-system^1` (main перед злиттям PR #19). Коміт тегу — `git rev-parse ws7-02-invites-roles`
(тег перенесено 19.10 на фінальний коміт після QA).

**Хронометраж — за колодою (Time cue в нотатках слайдів 15, 24, 36): демо 1 ≈ 3 хв, демо 2 ≈ 4 хв, демо 3 ≈ 3 хв.**
Кроки з позначкою **обов'язково** вкладаються в цей час (колода й конспект повторюють саме їх, у тому ж порядку);
«якщо є час» — лише коли демо йде швидше. Кожен живий запуск агента — не довше 2 хв, далі План Б.

## 0. Передумови (автор; за день і за годину до заняття)

1. **Supabase-проєкт не на паузі.** 19.10.2026 він був `INACTIVE` (Free засинає після ~7 днів без активності) —
   відновлено вручну (Restore). За день до заняття відкрити Dashboard і прод-URL.
2. **Міграції WS7 у хмарі** — обидві: `20261020000000_admin_user_management.sql` і `20261020000100_admin_set_role_private.sql`.
   Застосовує автор (агентові заборонено): в основній теці на свіжому `main` — `npx supabase db push`, **або** секрет
   environment `production` → `SUPABASE_DB_URL` і Actions → CI → Run workflow на `main` (job `db-deploy`). Перевірка:
   Dashboard → Database → Migrations — **вісім** міграцій, остання `20261020000100_admin_set_role_private`; або
   `node --env-file=.env.local scripts/demo-attack-role.mjs` в основній теці — крок 3 має сказати
   `ВІДМОВА HTTP 403 42501 FORBIDDEN`, а не «функції ще немає в базі». Скрипт виходить лише зі своєї сесії
   (`signOut({ scope: "local" })`), тож вікно 3 з `teacher@` лишається в системі.
   **Без міграцій** (стан на 19.10): демо 2 працює для ролі «працівник» (інша роль у формі → попередження «Акаунт
   створено з роллю «працівник»: роль не вдалося змінити…»); у демо 3 крок `rpc` повертає `PGRST202` (функції ще
   немає) — сказати це прямо й показати PGlite-тест (демо 3, крок 3). Локальний `npm run dev` тут не допоможе:
   `.env.local` дивиться в ту саму хмарну базу.
3. **`SUPABASE_SECRET_KEY` у Vercel** → Settings → Environment Variables → **лише Production** (не Preview: preview-збірка
   виконує код будь-якої гілки) → Redeploy. Без цього запрошення на проді — «Не вдалося створити посилання»; тоді
   демо 2 — локально: основна тека на `main`, `npm run dev` (бере `.env.local`), <http://localhost:3000>.
4. **Auth у Supabase:** реєстрація вимкнена (як у WS6). Site URL і Redirect URLs на наше посилання **не впливають**:
   ми будуємо його самі з `hashed_token`, а не беремо `action_link`.
5. **Claude Code ≥ 2.1.265** і `/login` (не API key) — для `/design` і артефактів; `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
   не задано. Артефакт дизайн-системи відкривається.
6. **Браузери** (усі входи — до заняття, на сцені паролів не вводимо):
   - вікно 1 — `admin@example.test`, відкрито `/admin/users`;
   - вікно 2 — **окремий профіль браузера** (або інший браузер) для запрошеного: посилання, відкрите у вікні
     адміністратора, замінило б його сесію; на старті — порожня вкладка;
   - вікно 3 — `teacher@example.test` (демо 3), відкрито головну, DevTools → Console відкрито, фрагмент із розділу 3 — у
     буфері або файлі поза кадром.
7. **Теки** (щоб не перемикати гілки на сцені). `.env.local` є лише в основній теці, тож **у теках `lp-ws7-0x`
   `npm run dev` не запускаємо** (proxy без змінних середовища падає на кожній сторінці); живий застосунок — прод-URL
   або основна тека. Тег `ws7-02-invites-roles` перенесено 19.10 — якщо теки створено раніше, оновити:

   ```bash
   cd D:/projects/clients/quitcode/2026-quitcode-06-leave-portal-demo
   git switch main && git pull --ff-only && git fetch --tags --force
   git worktree remove --force ../lp-ws7-02 2>/dev/null
   git worktree add --detach ../lp-ws7-00 ws7-01-design-system^1   # якщо ще немає
   git worktree add --detach ../lp-ws7-01 ws7-01-design-system     # якщо ще немає
   git worktree add --detach ../lp-ws7-02 ws7-02-invites-roles
   for d in ../lp-ws7-00 ../lp-ws7-01 ../lp-ws7-02; do (cd $d && npm ci --no-audit --no-fund); done
   ```

8. **Ворота** (очікувано — розділ 4): у кожній теці `npm run lint && npm run typecheck && npm test && npm run build`;
   `npm run check:design && npm run check:boundary` — лише в `lp-ws7-01` і `lp-ws7-02` (у `lp-ws7-00` цих скриптів
   немає — стан «до» перевіряємо з `lp-ws7-01`, демо 1, крок 2).
9. Сповіщення вимкнено; вкладки: артефакт, PR #19 → Checks (два jobs `architecture`), PR #27 (опис з мутаційною
   перевіркою), `docs/demo/ws7/` на GitHub, Supabase → Authentication → Users, прод-URL.

## 1. Демо 1 — дизайн-система (блок 1, слайд 15, ≈ 3 хв) — `lp-ws7-00` → `lp-ws7-01`

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | Артефакт <https://claude.ai/artifact/DKnNcLTXjgeErK1FoZR6b4>: бренд-бук (`project/README.md`), токени (світла/темна), Badge `pending/approved/returned/role` | артефакт відкривається; статуси — слово + колір | `docs/demo/ws7/artifact-cover-light.png`, `…-dark.png` |
| 2 | **обов'язково** | Термінал у `lp-ws7-01`: `node scripts/check-design-tokens.mjs --root ../lp-ws7-00` (у `lp-ws7-00` скрипта ще немає — ним перевіряємо стан «до»; **не** `npm run check:design` там) | список порушень (`zinc-*`, `amber-*`, `emerald-*`, `rose-*`, `bg-white`…), останній рядок `check-design-tokens: 56 порушень у 5 файлах. Правила — у DESIGN.md.`, exit 1 | вивід у описі PR #19 |
| 3 | **обов'язково** | `lp-ws7-01`: `cat CLAUDE.md` (`@AGENTS.md`, `@DESIGN.md`), потім `npm run check:design` | `check-design-tokens: OK — сирих кольорів поза src/components/ui немає.`, exit 0 | — |
| 4 | **обов'язково** | «До/після» світла й темна: `docs/demo/ws7/before-requests-new-teacher-light.png` ↔ `after-requests-new-teacher-light.png`, `…-dark` (Arial і сирі сірі → Geist і токени) | різниця очевидна | ті самі файли |
| 5 | якщо є час | `lp-ws7-01`: `DESIGN.md` (розділи 2, 5, 7, 11), `src/app/globals.css` (`:root`, темна тема, `@theme inline`, `status-*`), `src/components/ui/badge.tsx` | файли як описано | ті самі файли на GitHub на тезі `ws7-01-design-system` |
| 6 | якщо є час | Червоне наживо: у `lp-ws7-01/src/app/page.tsx` рядок 20 `<Card>` → `<Card className="bg-zinc-900">` → `npm run check:design` → `git checkout -- src/app/page.tsx` → знову | `src/app/page.tsx:20  [raw-palette]  bg-zinc-900  — сира палітра Tailwind — замініть на семантичний клас із DESIGN.md`, `check-design-tokens: 1 порушень у 1 файлах.`, exit 1 → OK, exit 0 | рядок у описі PR #19 |
| 7 | якщо є час | PR #19 → Checks: «Дизайн-система: лише токени», «Секретний ключ лише на сервері» (окремий `architecture.yml`; `ci.yml` не змінено) | обидва зелені | вкладка PR #19 → Checks, відкрита заздалегідь (передумова 9) |
| 8 | якщо є час | Візуальна перевірка агентом в **основній теці** (`npm run dev`, там є `.env.local`; вікно 1 уже з входом): Browser pane / Playwright MCP — «Додай порожній стан на /requests за DESIGN.md, зніми сторінку у світлій і темній темі, `npm run check:design`»; після показу — `git checkout -- .` | агент додає порожній стан, знімки, `check:design` OK | пропустити; знімки кроку 4 |

## 2. Демо 2 — запрошення (блок 2, слайд 24, ≈ 4 хв) — прод-URL або `npm run dev` в основній теці

**Посилання для активації на екрані — живий credential.** Лише одноразова адреса `ws7-live-<n>@example.test`
(`<n>` — номер спроби); після показу користувача видалити (розділ 5). На запис — не наближати поле посилання.
Без міграцій WS7 у хмарі роль у формі — лише «працівник» (передумова 2).

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | Вікно 1 (`admin@`, уже увійшов): меню «Користувачі» → `/admin/users` | таблиця: email, ім'я, роль (бейдж), посади, «Змінити роль» | `after-admin-users-admin-light.png` |
| 2 | **обов'язково** | «Запросити» → `ws7-live-<n>@example.test`, роль «працівник», підрозділ «Математика», посада «Вчитель математики» → «Запросити» | «Запрошення для ws7-live-<n>@example.test створено.», поле «Посилання для активації» (`…/auth/confirm?token_hash=…&type=invite&next=%2Faccount%2Fpassword`), підказка «Посилання одноразове й діє 1 годину…» | `after-admin-users-invite-link-blurred-*.png` (посилання розмите) |
| 3 | **обов'язково** | «Скопіювати посилання», потім «Готово» | «Посилання скопійовано» (AC-USERS-11); діалог закрито, у таблиці новий рядок `ws7-live-<n>@example.test`, бейдж «працівник», посада | `after-admin-users-admin-light.png` |
| 4 | **обов'язково** | Вікно 2 (окремий профіль): вставити посилання | сторінка «Активувати акаунт» — відкриття посилання нічого не перевіряє й не витрачає (так його відкривають і боти прев'ю месенджерів) | `after-auth-confirm-*.png` |
| 5 | **обов'язково** | «Активувати акаунт» → пароль ≥ 8 символів двічі → «Зберегти пароль» | `/account/password` «Новий пароль» з адресою акаунта → головна, «Пароль збережено. Вітаємо в порталі!», роль «працівник» (AC-USERS-02) | `after-account-password-*.png` |
| 6 | **обов'язково** | Те саме посилання ще раз (вікно 2) → «Активувати акаунт» | знову сторінка «Активувати акаунт»; після натискання — `/login` з «Посилання недійсне або вже використане. Зверніться до адміністратора.» (AC-USERS-05) | `after-login-link-error-*.png` |
| 7 | якщо є час | Вікно 1: «Запросити» → `Teacher@Example.test` → «Запросити» | під полем Email: «Користувач з цією адресою вже є в порталі» (AC-USERS-04); введене в полях лишилось | `npx vitest run tests/users/invite.test.ts` → `10 passed` |
| 8 | якщо є час | Код: `src/app/admin/users/actions.ts` (`inviteUser`: `getViewer()` → роль admin → **лише потім** `createAdminClient()` → `generateLink`), `src/lib/supabase/admin.ts` (перший рядок `import "server-only"`), `src/app/auth/confirm/page.tsx` (GET — лише форма) і `actions.ts` (`activate`: `verifyOtp` → `safeNextPath`) | порядок перевірок видно; `verifyOtp` — лише в POST | файли на GitHub на тезі `ws7-02-invites-roles`; `npx vitest run tests/auth tests/users` → `27 passed` |

Якщо запрошення на проді відповідає «Не вдалося створити посилання» — `SUPABASE_SECRET_KEY` не задано в Vercel
Production (передумова 3): перейти на локальний `npm run dev` в основній теці.

## 3. Демо 3 — атака й RLS (блок 3, слайд 36, ≈ 3 хв)

Ідея: публічний ключ — у браузері кожного; захищає не сторінка, а база.

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | Вікно 3 (`teacher@`, уже увійшов): вручну `/admin/users` | головна з повідомленням «Список користувачів бачить лише адміністратор.», пункту «Користувачі» в меню немає (AC-USERS-07) | `after-home-admin-only-teacher-*.png`; `npx vitest run -t "AC-USERS-07"` → `2 passed` |
| 2 | **обов'язково** | DevTools → Console: фрагмент нижче (сесія — з cookie сторінки, пароль не вводимо) | `update` → `status: 403`, `error.code: '42501'`, `error.message: 'permission denied for table profiles'`; `rpc` → з міграціями `status: 403`, `code: '42501'`, `message: 'FORBIDDEN'`; **без міграцій** — `status: 404`, `code: 'PGRST202'` («функції ще немає» — так і сказати); роль лишається `"employee"` | `node --env-file=.env.local scripts/demo-attack-role.mjs` в основній теці (вивід нижче) |
| 3 | **обов'язково** | Термінал у `lp-ws7-02`: `npx vitest run tests/db/users-db.test.ts` (та сама атака — у PGlite з усіма міграціями) | `Test Files  1 passed (1)`, `Tests  13 passed (13)`: AC-USERS-10, 07, 13, 01, 03, 06 (×2), 09 (`UPDATE` і `rpc`), 08, 16, «логіка — у private…», «невідома роль…» | вивід у PR #27 |
| 4 | якщо є час | Міграція `supabase/migrations/20261020000100_admin_set_role_private.sql`: заголовок (дві функції — чому), `private.admin_set_role` (`security definer`, перевірка admin першим оператором, `LAST_ADMIN`), `public.admin_set_role` (`security invoker`), `revoke … from public, anon` | — | файл на GitHub |
| 5 | якщо є час | «Зелені тести брешуть» наживо: у `lp-ws7-02` у цьому файлі видалити рядки 32–35 (`if (select private.current_app_role()) is distinct from 'admin' then … 'FORBIDDEN' … end if;`) → `npx vitest run tests/db/users-db.test.ts` → повернути `git checkout -- supabase/migrations/20261020000100_admin_set_role_private.sql` → знову | `Tests  2 failed \| 11 passed (13)`: × `AC-USERS-09: працівник не підвищує собі роль і через RPC admin_set_role — FORBIDDEN`, × `AC-USERS-08: менеджер напряму не змінює ролі — FORBIDDEN, нічого не змінено` (`promise resolved "[ { admin_set_role: '' } ]" instead of rejecting`); інші не червоніють (ролі повертаються у `finally`) → після відкату `13 passed` | опис PR #27, розділ «Як перевірено» |
| 6 | якщо є час | Вікно 1, `admin@`: «Змінити роль» себе на «працівник» → «Змінити» (лише з міграціями) | «Роль не змінено. Не можна змінити роль останнього адміністратора» (AC-USERS-06) | `after-roles-admin-users-error-LAST_ADMIN-admin-*.png` |

Консоль браузера (крок 2). `teacher@` уже увійшов у вікні 3, тож пароль не потрібен: `createBrowserClient` з `@supabase/ssr`
бере сесію з cookie сторінки (вони не `httpOnly`). Project URL і publishable key — Dashboard → Project Settings → API Keys;
обидва публічні (так само є в будь-якому клієнті), їх можна вставити в `prompt`. Перевірено 19.10.2026 на `npm run dev`
(Playwright, Edge): `update` → `42501 permission denied for table profiles`; `rpc` до міграцій → `PGRST202`. Репетиція на
прод-URL обов'язкова: `esm.sh` має відкриватися з мережі заняття.

```js
const { createBrowserClient } = await import("https://esm.sh/@supabase/ssr@0.12.7");
const sb = createBrowserClient(prompt("Project URL"), prompt("Publishable key"));
const { data: { user } } = await sb.auth.getUser();                                   // teacher@example.test
await sb.from("profiles").update({ role: "admin" }).eq("id", user.id).select();     // → status 403, 42501 permission denied for table profiles
await sb.rpc("admin_set_role", { p_user: user.id, p_role: "admin" });                 // → status 403, 42501 FORBIDDEN (без міграцій — 404 PGRST202)
(await sb.from("profiles").select("role").eq("id", user.id).single()).data.role;     // → "employee"
```

`scripts/demo-attack-role.mjs` (План Б) робить те саме з Node: вхід `teacher@` з публічним ключем, `select`, `update role`,
`rpc`; секретний ключ не потрібен, пароль не друкується; наприкінці виходить лише зі своєї сесії. Вивід 19.10.2026
(до міграцій у хмарі):

```text
Увійшли як teacher@example.test (публічний ключ). Роль зараз: employee
1) select profiles: видно профілів — 1 (RLS: лише свій)
2) update profiles set role = 'admin': ВІДМОВА HTTP 403 42501 permission denied for table profiles
3) rpc admin_set_role(себе, 'admin'): функції ще немає в базі (HTTP 404 PGRST202) — міграції 20261020000000 і 20261020000100 не застосовано
Роль після спроб: employee
```

Після застосування міграцій рядок 3 — `3) rpc admin_set_role(себе, 'admin'): ВІДМОВА HTTP 403 42501 FORBIDDEN`.

## 4. Очікувані результати воріт

| Тека / тег | `npm test` | `check:design` | `check:boundary` | `ac:coverage` |
|---|---|---|---|---|
| `lp-ws7-00` (`ws7-01-design-system^1`) | 79 passed | скрипта ще немає; `node scripts/check-design-tokens.mjs --root ../lp-ws7-00` з `lp-ws7-01` — 56 порушень у 5 файлах, exit 1 | скрипта ще немає | OK; 23 AC, «реалізовано» 11 (AC-USERS — «відкладено (чекає реалізації)»), WARN немає |
| `lp-ws7-01` (`ws7-01-design-system`) | 79 passed | OK | OK | як вище |
| `lp-ws7-02` (`ws7-02-invites-roles`) | 119 passed (14 файлів) | OK | OK | OK; 17 AC у вимогах PM, 28 у специфікаціях, «реалізовано» 27, AC-USERS-11 «відкладено (e2e у WS8)» |

`npm run build` на всіх: `ƒ Proxy (Middleware)`; на `ws7-02` ще `ƒ /admin/users`, `ƒ /auth/confirm`, `ƒ /account/password`.

## 5. Прибирання після демо

- Видалити користувача(ів) `ws7-live-*@example.test`: Supabase → Authentication → Users → … → Delete user (профіль і
  посада видаляються каскадом). Перевірка: `/admin/users` під `admin@` — п'ять демо-користувачів.
- Якщо на сцені змінювали ролі — повернути: `teacher2@` — «працівник», `admin@` — «адміністратор».
- Якщо робили мутацію (демо 3, крок 5) чи агента (демо 1, крок 8) — `git status` у `lp-ws7-02` і в основній теці чисті.
- Закрити вікно 2 (сесія запрошеного) і вкладку DevTools; не зберігати запис екрана з посиланням без розмиття.
- `git worktree remove ../lp-ws7-00` (і `-01`, `-02`) — коли теки більше не потрібні.
