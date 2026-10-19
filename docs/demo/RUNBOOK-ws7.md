# RUNBOOK: демо WS7 «Fullstack з AI: фронт і бек» — дизайн-система, запрошення, ролі

Сценарій для ведучого заняття Вт 20.10.2026: що показати, які команди, що має вийти і що робити, якщо не вийшло
(План Б). Зразок формату — [`RUNBOOK.md`](RUNBOOK.md) (WS6). Дані лише синтетичні (`*@example.test`).

Зріз демо WS7 — `add-user-invites`: «Адміністратор запрошує працівника посиланням для активації, призначає роль і
посаду; працівник задає пароль». Модель v2: вимоги PM — в окремому репо, тут — знімок `requirements/`.

| Що | Де |
|---|---|
| Репо вимог PM (варіант `docs/`) | <https://github.com/koldovsky/2026-quitcode-07-leave-portal-spec> — `docs/product.md`, `docs/requirements/01-user-invites.md` (AC-USERS-01…12) |
| Артефакт Claude Design System | <https://claude.ai/artifact/DKnNcLTXjgeErK1FoZR6b4> («Портал відсутностей — дизайн-система», приватний) |
| PR-и WS7 у цьому репо | #16 «Оновлення шаблону» (`/requirements-sync`), #17 «Оновлення вимог», #18 «Специфікація» (`add-user-invites` + `impl-user-invites`), #19 «Дизайн-система», #20 «Запрошення», #21 «Ролі» |
| Специфікація | `openspec/specs/user-management/spec.md`; архів змін — `openspec/changes/archive/2026-10-19-add-user-invites/`, `…/2026-10-19-impl-user-invites/` (`design.md`, `tasks.md`) |
| Знімки для Планів Б | `docs/demo/ws7/` (світла `-light`, темна `-dark`) |

| Тег | Коміт | Що в ньому | Блок деки |
|---|---|---|---|
| `ws7-01-design-system` | `10e83d7` | токени в `src/app/globals.css`, shadcn/ui у `src/components/ui/`, `DESIGN.md`, `CLAUDE.md` → `@DESIGN.md`, `scripts/check-design-tokens.mjs`, `.github/workflows/architecture.yml`, ADR 0001; усі сторінки без сирих кольорів | 1 |
| `ws7-02-invites-roles` | `44fb93b` | `src/lib/supabase/admin.ts`, `/admin/users`, `/auth/confirm`, `/account/password`, міграція `20261020000000_admin_user_management.sql` (`public.admin_set_role`), PGlite-тести, ADR 0002 і 0003 | 2, 3 |

Стан «до дизайн-системи» — `ws7-01-design-system^1` (main перед злиттям PR #19).

## 0. Передумови (автор; за день і за годину до заняття)

1. **Supabase-проєкт не на паузі.** 19.10.2026 він був `INACTIVE` (Free засинає після ~7 днів без активності) —
   відновлено вручну (Restore). За день до заняття відкрити Dashboard і прод-URL.
2. **Міграція WS7 у хмарі.** `supabase/migrations/20261020000000_admin_user_management.sql` застосовує автор (агентові
   заборонено): в основній теці на свіжому `main` — `npx supabase db push`, **або** секрет environment
   `production` → `SUPABASE_DB_URL` і Actions → CI → Run workflow на `main` (job `db-deploy`). Перевірка: Dashboard →
   Database → Migrations — **сім** міграцій, остання `20261020000000_admin_user_management`; або
   `node --env-file=.env.local scripts/demo-attack-role.mjs` — крок 3 має сказати `ВІДМОВА 42501 FORBIDDEN`, а не
   «функції ще немає в базі». Без міграції: запрошення працює, зміна ролі — «Не вдалося змінити роль».
3. **`SUPABASE_SECRET_KEY` у Vercel** → Settings → Environment Variables → **лише Production** (не Preview: preview-збірка
   виконує код будь-якої гілки) → Redeploy. Без цього запрошення на проді — «Не вдалося створити посилання»; тоді
   демо 2 — локально: основна тека на `main`, `npm run dev` (бере `.env.local`), <http://localhost:3000>.
4. **Auth у Supabase:** реєстрація вимкнена (як у WS6). Site URL і Redirect URLs на наше посилання **не впливають**:
   ми будуємо його самі з `hashed_token`, а не беремо `action_link`.
5. **Claude Code ≥ 2.1.265** і `/login` (не API key) — для `/design` і артефактів; `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
   не задано. Артефакт дизайн-системи відкривається.
6. **Браузери:** вікно 1 — адміністратор (`admin@`); вікно 2 — **окремий профіль браузера** (або інший браузер) для
   запрошеного: посилання, відкрите у вікні адміністратора, замінить його сесію. Вікно 3 — `teacher@` (демо 3).
7. **Теки** (щоб не перемикати гілки на сцені; `.env.local` є лише в основній теці):

   ```bash
   cd D:/projects/clients/quitcode/2026-quitcode-06-leave-portal-demo
   git switch main && git pull --ff-only
   git worktree add --detach ../lp-ws7-00 ws7-01-design-system^1
   git worktree add --detach ../lp-ws7-01 ws7-01-design-system
   git worktree add --detach ../lp-ws7-02 ws7-02-invites-roles
   for d in ../lp-ws7-00 ../lp-ws7-01 ../lp-ws7-02; do (cd $d && npm ci --no-audit --no-fund); done
   ```

8. **Ворота** (очікувано — розділ 4): у кожній теці `npm run lint && npm run typecheck && npm test && npm run build`,
   плюс `npm run check:design && npm run check:boundary` (скрипти є з `ws7-01`).
9. Сповіщення вимкнено; вкладки: артефакт, PR #19 (два jobs `architecture`), PR #21 (опис з мутаційною перевіркою),
   `docs/demo/ws7/` на GitHub, Supabase → Authentication → Users, прод-URL.

## 1. Демо 1 — дизайн-система (блок 1, ~6 хв) — `lp-ws7-00` → `lp-ws7-01`

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | Артефакт <https://claude.ai/artifact/DKnNcLTXjgeErK1FoZR6b4>: бренд-бук (`project/README.md`), токени (світла/темна), Badge `pending/approved/returned/role`, Notice | артефакт відкривається; статуси — слово + колір | `docs/demo/ws7/artifact-cover-light.png`, `…-dark.png` |
| 2 | `lp-ws7-01`: `node scripts/check-design-tokens.mjs --root ../lp-ws7-00` (у `lp-ws7-00` скрипта ще немає — ним перевіряємо стан «до») | **56 порушень у 5 файлах** (`zinc-*`, `amber-*`, `emerald-*`, `rose-*`, `bg-white`…), exit 1 | вивід у описі PR #19 |
| 3 | `lp-ws7-01`: `DESIGN.md` (розділи 2, 5, 7, 8, 9), `CLAUDE.md` (`@DESIGN.md`), `src/app/globals.css` (`:root`, темна тема, `@theme inline`, `status-*`), `src/components/ui/badge.tsx` (варіанти), `AGENTS.md` → «Дизайн-система» | файли як описано | ті самі файли на GitHub на тезі `ws7-01-design-system` |
| 4 | `lp-ws7-01`: `npm run check:design` | `check-design-tokens: OK — сирих кольорів поза src/components/ui немає.` | — |
| 5 | Червоне наживо: у `src/app/page.tsx` дописати `className="bg-zinc-900"` до `<Card>` → `npm run check:design` → прибрати (`git checkout -- src/app/page.tsx`) → знову | `src/app/page.tsx:20  [raw-palette]  bg-zinc-900 …`, exit 1 → OK, exit 0 | рядок у описі PR #19 |
| 6 | PR #19 на GitHub → Checks: «Дизайн-система: лише токени», «Секретний ключ лише на сервері» (окремий `architecture.yml`; `ci.yml` не змінено) | обидва зелені | знімок вкладки Checks |
| 7 | «До/після» світла й темна: `docs/demo/ws7/before-requests-new-teacher-light.png` ↔ `after-requests-new-teacher-light.png`, `…-dark` (Arial і сирі сірі → Geist і токени) | різниця очевидна | ті самі файли |
| 8 (якщо є час) | Візуальна перевірка агентом: Browser pane / Playwright MCP — «зніми /login і /requests/new у світлій і темній темі, порівняй з DESIGN.md, виправ відхилення» | агент знаходить і виправляє | пропустити; знімки кроку 7 |

## 2. Демо 2 — запрошення (блок 2, ~5 хв) — прод-URL або `npm run dev` в основній теці

**Посилання для активації на екрані — живий credential.** Лише одноразова адреса `ws7-live-<n>@example.test`
(`<n>` — номер спроби); після показу користувача видалити (розділ 5). На запис — не наближати поле посилання.

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | Вікно 1: вхід `admin@example.test` → меню «Користувачі» → `/admin/users` | таблиця: email, ім'я, роль (бейдж), посади, «Змінити роль» | `after-admin-users-admin-light.png` |
| 2 | «Запросити» → `Teacher@Example.test` → «Запросити» | «Користувач з цією адресою вже є в порталі» (AC-USERS-04) | `tests/users/invite.test.ts` |
| 3 | `ws7-live-<n>@example.test`, роль «працівник», підрозділ «Математика», посада «Вчитель математики» → «Запросити» | «Запрошення для … створено.», поле «Посилання для активації», підказка «одноразове й діє 1 годину» | `after-admin-users-invite-link-blurred-*.png` (посилання розмите) |
| 4 | «Скопіювати посилання» | «Посилання скопійовано» (AC-USERS-11) | — |
| 5 | Код: `src/app/admin/users/actions.ts` (`inviteUser`: `getViewer()` → роль admin → **лише потім** `createAdminClient()` → `generateLink`), `src/lib/supabase/admin.ts` (перший рядок `import "server-only"`), `src/lib/users/invite.ts` (`buildActivationLink`) | порядок перевірок видно | файли на тезі `ws7-02-invites-roles` |
| 6 | Вікно 2 (окремий профіль): вставити посилання | `/account/password` «Новий пароль» з адресою акаунта | `after-account-password-*.png` |
| 7 | Пароль ≥ 8 символів двічі → «Зберегти пароль» | головна, «Пароль збережено. Вітаємо в порталі!», роль «працівник» | — |
| 8 | Те саме посилання ще раз (вікно 2 або інкогніто) | `/login`: «Посилання недійсне або вже використане. Зверніться до адміністратора.» (AC-USERS-05) | `after-login-link-error-*.png` |
| 9 | Код: `src/app/auth/confirm/route.ts` (`verifyOtp`), `src/lib/auth/next-path.ts` (`safeNextPath`: лише відносний шлях, не `//`, не `/\`) | — | `npx vitest run tests/auth tests/users` |
| 10 (якщо є час) | Вікно 1: у списку — `ws7-live-<n>@example.test`, роль «працівник», посада | рядок є | — |

Якщо запрошення на проді відповідає «Не вдалося створити посилання» — `SUPABASE_SECRET_KEY` не задано в Vercel
Production (передумова 3): перейти на локальний `npm run dev`.

## 3. Демо 3 — атака й RLS (блок 3, ~5 хв)

Ідея: публічний ключ — у браузері кожного; захищає не сторінка, а база. Потрібна міграція WS7 у хмарі (передумова 2).

| Крок | Показати / команда | Очікувано | План Б |
|---|---|---|---|
| 1 | Вікно 3: `teacher@example.test` → вручну `/admin/users` | головна, пункту «Користувачі» в меню немає (AC-USERS-07) | `npx vitest run -t "AC-USERS-07"` |
| 2 | DevTools → Console, рядки нижче (сесія — з cookie сторінки, пароль не вводимо) | `update` → `{ code: '42501', message: 'permission denied for table profiles' }`; `rpc` → `{ code: '42501', message: 'FORBIDDEN' }` | `node --env-file=.env.local scripts/demo-attack-role.mjs` в основній теці |
| 3 | Міграція `supabase/migrations/20261020000000_admin_user_management.sql`: заголовок (пастка «update own row + колонка role»), `public.admin_set_role` (перевірка admin першим оператором, `LAST_ADMIN`, `revoke … from public, anon`) | — | файл на GitHub |
| 4 | `npx vitest run tests/db/users-db.test.ts` | 11 passed (AC-USERS-03, 06, 08, 09, 10, 01, 07) | вивід у PR #21 |
| 5 | «Зелені тести брешуть»: опис PR #21 — мутаційна перевірка (без перевірки admin у функції → 3 червоні) | — | — |
| 6 (якщо є час) | Вікно 1, `admin@`: «Змінити роль» себе на «працівник» | «Роль не змінено. Не можна змінити роль останнього адміністратора» (AC-USERS-06) | `after-roles-admin-users-error-LAST_ADMIN-*.png` |

Консоль браузера (крок 2). `teacher@` уже увійшов у вікні 3, тож пароль не потрібен: `createBrowserClient` з `@supabase/ssr`
бере сесію з cookie сторінки (вони не `httpOnly`). Project URL і publishable key — Dashboard → Project Settings → API Keys;
обидва публічні (так само є в будь-якому клієнті), їх можна вставити в `prompt`. Перевірено 19.10.2026 на `npm run dev`
(Playwright, Edge): `update` → `42501 permission denied for table profiles`; `rpc` до міграції → `PGRST202`. Репетиція на
прод-URL обов’язкова: `esm.sh` має відкриватися з мережі заняття.

```js
const { createBrowserClient } = await import("https://esm.sh/@supabase/ssr@0.12.7");
const sb = createBrowserClient(prompt("Project URL"), prompt("Publishable key"));
const { data: { user } } = await sb.auth.getUser();                                   // teacher@example.test
await sb.from("profiles").update({ role: "admin" }).eq("id", user.id).select();     // → 42501 permission denied for table profiles
await sb.rpc("admin_set_role", { p_user: user.id, p_role: "admin" });                 // → 42501 FORBIDDEN (до міграції — PGRST202)
(await sb.from("profiles").select("role").eq("id", user.id).single()).data.role;     // → "employee"
```

Без міграції WS7 `rpc` поверне `PGRST202` (функції немає) — сказати це прямо й показати PGlite-тест (крок 4).

`scripts/demo-attack-role.mjs` (План Б) робить те саме з Node: вхід `teacher@` з публічним ключем, `select`, `update role`,
`rpc`; секретний ключ не потрібен, пароль не друкується. Вивід 19.10.2026 (до міграції в хмарі):

```text
Увійшли як teacher@example.test (публічний ключ). Роль зараз: employee
1) select profiles: видно профілів — 1 (RLS: лише свій)
2) update profiles set role = 'admin': ВІДМОВА 42501 permission denied for table profiles
3) rpc admin_set_role(себе, 'admin'): функції ще немає в базі — міграцію 20261020000000 не застосовано
Роль після спроб: employee
```

## 4. Очікувані результати воріт

| Тека / тег | `npm test` | `check:design` | `check:boundary` | `ac:coverage` |
|---|---|---|---|---|
| `lp-ws7-00` (`ws7-01-design-system^1`) | 79 passed | скрипта ще немає; `node scripts/check-design-tokens.mjs --root ../lp-ws7-00` з `lp-ws7-01` — 56 порушень у 5 файлах, exit 1 | скрипта ще немає | OK; 23 AC, «реалізовано» 11 (AC-USERS — «відкладено (чекає реалізації)»), WARN немає |
| `lp-ws7-01` (`ws7-01-design-system`) | 79 passed | OK | OK | як вище |
| `lp-ws7-02` (`ws7-02-invites-roles`) | 110 passed | OK | OK | OK; «реалізовано» 22, AC-USERS-11 «відкладено (e2e у WS8)» |

`npm run build` на всіх: `ƒ Proxy (Middleware)`; на `ws7-02` ще `ƒ /admin/users`, `ƒ /auth/confirm`, `ƒ /account/password`.

## 5. Прибирання після демо

- Видалити користувача(ів) `ws7-live-*@example.test`: Supabase → Authentication → Users → … → Delete user (профіль і
  посада видаляються каскадом). Перевірка: `/admin/users` під `admin@` — п'ять демо-користувачів.
- Якщо на сцені змінювали ролі — повернути: `teacher2@` — «працівник», `admin@` — «адміністратор».
- Закрити вікно 2 (сесія запрошеного) і вкладку DevTools; не зберігати запис екрана з посиланням без розмиття.
- `git worktree remove ../lp-ws7-00` (і `-01`, `-02`) — коли теки більше не потрібні.
