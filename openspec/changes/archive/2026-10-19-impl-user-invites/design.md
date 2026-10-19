# Design: impl-user-invites

## Context

- Специфікація: `openspec/specs/user-management/spec.md`, AC-USERS-01 … AC-USERS-12 (переклад
  `requirements/01-user-invites.md`). Матриця прав — `requirements/product.md`.
- Наявне: `profiles` (`id`, `email`, `full_name`, `role`; рядок створює тригер `on_auth_user_created` з `auth.users`),
  хелпер `private.current_app_role()`, колонковий `grant update (full_name)` — **без** `role`; політики admin на
  `positions` і `divisions` (`20261013000000_leave_requests.sql`); `getViewer()`/`requireRole()` у
  `src/lib/supabase/viewer.ts` (роль — з `profiles`, `getClaims()`).
- Обмеження: вбудований SMTP Supabase — 2 листи/год і лише членам проєкту, тож листів немає: посилання копіює
  адміністратор (Assumptions PM). Реєстрація в Supabase вимкнена (`enable_signup = false`) — і має лишитись такою.
- Спайк 19.10.2026 на хмарному проєкті демо (`enable_signup = false`): `auth.admin.generateLink({ type: "invite" })`
  створює користувача й повертає `properties.hashed_token`; `verifyOtp({ type: "invite", token_hash })` дає сесію;
  повторне використання → `403 otp_expired`; запрошення вже активованої адреси → `422 email_exists`.
- Дизайн: сторінки — на токенах і компонентах `@/components/ui` (PR «Дизайн-система», `DESIGN.md`).

## Goals / Non-Goals

**Goals:**

- Кожен AC-USERS: код + тест з AC ID у назві (або чесне «відкладено» з причиною) + рядок у `docs/conformance.md`.
- Секретний ключ лише на сервері, лише в одному модулі і лише після перевірки ролі admin.
- Роль змінюється тільки однією функцією бази з перевіркою admin і захистом останнього admin — і з UI, і з Data API.

**Non-Goals:**

- Листи-запрошення, видалення/блокування користувачів, додаткові посади й менеджери підрозділів (WS8), повторне
  запрошення (Q1 PM), історія змін ролей (Q2 PM).
- Custom Access Token Hook (роль у JWT) — див. ADR 0002.

## Decisions

### 1. UI і маршрути

| Маршрут | Хто | Що |
|---|---|---|
| `/admin/users` (`src/app/admin/users/page.tsx`) | admin (`requireRole("admin")`) | таблиця: email, ім'я, роль (`Badge variant="role"`), посади; зміна ролі (`NativeSelect` + кнопка); «Запросити» (`Dialog`); порожній стан (AC-USERS-12) |
| `/auth/confirm` (`src/app/auth/confirm/route.ts`) | будь-хто з посиланням | `verifyOtp` → сесія → `next`; помилка → `/login?error=link` (AC-USERS-05) |
| `/account/password` (`src/app/account/password/page.tsx`) | будь-хто з сесією | новий пароль двічі, ≥ 8 символів (AC-USERS-02) |
| навігація (`src/app/_components/ui.tsx`) | admin | пункт «Користувачі» |

Компоненти: `Button`, `Input`, `Label`, `Card`, `Table`, `Badge`, `Dialog`, `NativeSelect`, `Alert` з
`@/components/ui`; клієнтські — `InviteDialog` (форма запрошення з `useActionState`) і `CopyLinkButton`
(`navigator.clipboard.writeText` → «Посилання скопійовано», `role="status"`, AC-USERS-11).

### 2. Server Actions і Route Handler

| Дія | Файл | Кроки |
|---|---|---|
| `inviteUser(prev, formData)` | `src/app/admin/users/actions.ts` | `getViewer()` (`getClaims()`, роль з `profiles`) → не admin: `FORBIDDEN`, admin-клієнт навіть не створюється (AC-USERS-08) → валідація email/ролі/посади → адреса вже є? (`profiles.email`, без регістру, клієнтом користувача під RLS) → `EMAIL_EXISTS` (AC-USERS-04) → **лише тепер** `createAdminClient().auth.admin.generateLink({ type: "invite", email })` → роль `rpc("admin_set_role")` і посада `insert positions` — клієнтом адміністратора під RLS → посилання |
| `changeRole(formData)` | `src/app/admin/users/actions.ts` | `getViewer()` → не admin: на головну, нічого не змінено → `rpc("admin_set_role")` **клієнтом користувача** (не admin-клієнтом) → помилки бази `LAST_ADMIN` / `FORBIDDEN` → повідомлення |
| `setPassword(prev, formData)` | `src/app/account/password/actions.ts` | `getClaims()` → немає сесії: на `/login` → ≥ 8 символів і збіг → `auth.updateUser({ password })` → `/?welcome=1` |
| `GET /auth/confirm` | `src/app/auth/confirm/route.ts` | `type` ∈ {`invite`, `recovery`}, інакше відмова → `verifyOtp({ type, token_hash })` → `redirect(safeNextPath(next))`; помилка → `redirect("/login?error=link")` |

- Логіка без Next.js і Supabase — у чистих модулях з юніт-тестами: `src/lib/users/invite.ts` (`validateInvite`,
  `buildActivationLink`, `inviteUserCore` з залежностями, які передає дія), `src/lib/auth/next-path.ts`
  (`safeNextPath`: лише відносний шлях, що починається з `/`, не `//` і не `/\`, інакше `/` — захист від open
  redirect), `src/lib/auth/confirm.ts` (`confirmTarget`), `src/lib/auth/password.ts` (`validatePassword`),
  `src/lib/users/roles.ts` (підписи ролей, `canManageUsers`, `usersEmptyState`).
- Посилання будуємо самі: `<origin>/auth/confirm?token_hash=…&type=invite&next=/account/password`. `action_link`
  Supabase не використовуємо, тож Site URL і Redirect URLs проєкту на нього не впливають. `origin` — заголовок
  `Origin` запиту Server Action (Next.js перевіряє, що він збігається з `Host`), запасний — `x-forwarded-proto` +
  `host`. Посилання ніде не логуємо: це живий credential (ADR 0003).
- Ім'я запрошеного — у `user_metadata.full_name` (тригер копіює його в `profiles.full_name`). Роль **ніколи** не
  з `user_metadata`: користувач змінює його сам через `updateUser({ data })`.
- `proxy.ts` (`PUBLIC_PATHS` = `/login`, `/auth`) лише оновлює сесію й редіректить — це UX. Захист — у кожній
  дії й сторінці (`getViewer`/`requireRole`) і в базі (RLS, RPC). Server Actions — публічні POST-ендпойнти.

### 3. Секретний ключ

- `src/lib/supabase/admin.ts`: перший рядок `import "server-only";`, `SUPABASE_SECRET_KEY` читається лише тут,
  клієнт без сесії (`persistSession: false`). Імпортують його лише `actions.ts` / `route.ts`; правило перевіряє
  `scripts/check-server-boundary.mjs` (`npm run check:boundary`, job «Секретний ключ лише на сервері» в
  `.github/workflows/architecture.yml`).
- Admin-клієнт потрібен **лише** для `generateLink`. Роль і посаду новому користувачу ставить адміністратор своїм
  клієнтом під RLS — той самий шлях, що й зміна ролі зі сторінки.
- Vercel: `SUPABASE_SECRET_KEY` — лише Production (не Preview: preview-збірки виконують код будь-якої гілки).

### 4. База: міграція `20261020000000_admin_user_management.sql`

- `public.admin_set_role(p_user uuid, p_role text) returns void`, `security definer`, `set search_path = ''`:
  1. `private.current_app_role() = 'admin'`, інакше `raise exception 'FORBIDDEN' using errcode = '42501'`
     (AC-USERS-08, AC-USERS-09, AC-USERS-10 — і для прямого `rpc` з публічним ключем);
  2. `p_role` ∈ `employee | manager | admin`, інакше `22023`; користувача немає — `P0002`;
  3. останній admin: блокування `pg_advisory_xact_lock` + `count(*)` адміністраторів; понизити єдиного —
     `raise exception 'LAST_ADMIN' using errcode = '23514'` (AC-USERS-06);
  4. `update public.profiles set role = p_role where id = p_user` (AC-USERS-03).
  - `revoke execute … from public, anon`; `grant execute … to authenticated`.
  - Чому `security definer` у `public`, хоча правило 5 міграцій каже «definer — лише в `private`»: це навмисна
    точка входу RPC, яка має записати колонку **без** column grant. Компенсація: перевірка ролі — першим
    оператором, `search_path = ''`, `execute` лише `authenticated`. Виняток записано в заголовку міграції й
    `AGENTS.md`.
- `profiles.role` лишається **без** колонкового grant. Пастка, яку закриваємо: політика `profiles_update_own`
  («оновлюю свій рядок») + `grant update (role)` = будь-хто сам робить себе admin (AC-USERS-09).
- Email у списку — наявна колонка `profiles.email` (заповнює тригер з `auth.users.email`); admin читає всі профілі
  політикою `profiles_select_own_or_admin`, решта — лише свій (і менеджер — профілі своєї черги). Читати
  `auth.users` з застосунку не треба. Ризик: зміна email в Auth не оновить `profiles.email` — у порталі зміни email
  немає (поза зрізом).
- Посада під час запрошення — наявні `positions_insert_admin` і `grant insert` (нових політик не треба).
- Ролі в таблиці + RLS, а не в JWT (Custom Access Token Hook) — ADR 0002: нова роль діє з наступного запиту
  (AC-USERS-03), а роль у JWT застаріває до оновлення токена (до години).

### 5. Тести

| AC | Тест |
|---|---|
| 01 | `tests/users/invite.test.ts` — `inviteUserCore` для admin: email нормалізовано, роль і посада призначені, посилання з `token_hash`; `buildActivationLink` |
| 02 | `tests/auth/confirm.test.ts` — `safeNextPath`, `confirmTarget` (успіх → `/account/password`); `validatePassword` |
| 03, 06, 09 | `tests/db/users-db.test.ts` (PGlite) — admin змінює роль; останнього admin не понизити; працівник не змінює собі роль ні `update`, ні `rpc` |
| 04 | `tests/users/invite.test.ts` — наявна адреса (інший регістр) → `EMAIL_EXISTS`, `generateLink` не викликано |
| 05 | `tests/auth/confirm.test.ts` — помилка `verifyOtp`, невідомий `type`, без `token_hash` → `/login?error=link` |
| 07 | `tests/users/roles.test.ts` — `canManageUsers` лише для admin |
| 08 | `tests/users/invite.test.ts` (менеджер → `FORBIDDEN`, admin-клієнт не викликано) і `tests/db/users-db.test.ts` (`rpc` менеджера → 42501) |
| 10 | `tests/db/users-db.test.ts` — `anon` не читає `profiles` і не виконує `admin_set_role` |
| 11 | відкладено: буфер обміну — поведінка браузера, e2e-тест у WS8; вручну — RUNBOOK-ws7 |
| 12 | `tests/users/roles.test.ts` — `usersEmptyState` |

Мутаційна перевірка: тимчасово прибрати перевірку admin з `admin_set_role` → тести AC-USERS-08/09 мають впасти.

## Risks / Trade-offs

- Посилання = credential: хто відкрив першим, той і задає пароль. Попередження в UI, одноразовість, 1 година,
  без логування; прев'ю посилань у месенджерах може «з'їсти» одноразовий GET — ADR 0003.
- Запрошення не атомарне: якщо після `generateLink` не вдалося призначити роль чи посаду, користувач існує з роллю
  `employee`; адміністратор бачить попередження й виправляє роль у списку.
- Повторне запрошення не активованої адреси — поза зрізом (Q1 PM): `EMAIL_EXISTS` за `profiles.email`.
- Роль у таблиці — додатковий запит на кожну сторінку (`getViewer`); прийнятно на цьому масштабі (ADR 0002).
