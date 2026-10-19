# Tasks

Вертикальні задачі: UI + Server Action / Route Handler + база/RLS + тест. Кожна закінчується рядком «Done when» з
AC ID; перевірка — `npm test`, `npm run ac:coverage`, `npm run check:design`, `npm run check:boundary`.
Передумова — PR «Дизайн-система» (тег `ws7-01-design-system`).

## 1. Запрошення (PR «Реалізація: запрошення»)

- [x] 1.1 `src/lib/supabase/admin.ts` (`import "server-only"`, `SUPABASE_SECRET_KEY` лише тут); `inviteUserCore`,
  `validateInvite`, `buildActivationLink` у `src/lib/users/invite.ts`; Server Action `inviteUser` у
  `src/app/admin/users/actions.ts`: спершу `getViewer()` і роль admin, потім admin-клієнт і `generateLink`; тести.
  Done when: AC-USERS-01, AC-USERS-04, AC-USERS-08.
- [x] 1.2 Сторінка `/admin/users` (`requireRole("admin")`): таблиця користувачів з ролями й посадами, `InviteDialog`,
  `CopyLinkButton`, порожній стан; пункт навігації «Користувачі» лише для admin; тести `canManageUsers`,
  `usersEmptyState`.
  Done when: AC-USERS-07, AC-USERS-11 (вручну), AC-USERS-12.
- [x] 1.3 `src/app/auth/confirm/route.ts` (`verifyOtp`, `safeNextPath`, помилка → `/login?error=link`), повідомлення на
  `/login`; `/account/password` з `setPassword`; тести `safeNextPath`, `confirmTarget`, `validatePassword`.
  Done when: AC-USERS-02, AC-USERS-05.
- [x] 1.4 ADR `docs/decisions/0003-invites-via-generate-link.md`; `AGENTS.md`, `.env.example` — `SUPABASE_SECRET_KEY`
  у Vercel лише Production.
  Done when: ADR прийнято; `npm run check:boundary` зелений.

## 2. Ролі (PR «Реалізація: ролі»)

- [x] 2.1 Міграція `20261020000000_admin_user_management.sql`: `public.admin_set_role` (перевірка admin першим
  оператором, захист останнього admin, `execute` лише `authenticated`); `database.types.ts`; PGlite-тести.
  Done when: AC-USERS-03, AC-USERS-06, AC-USERS-09, AC-USERS-10 — тести зелені; мутаційна перевірка (без перевірки
  admin у функції тести AC-USERS-08/09 червоні) записана в PR.
- [x] 2.2 Зміна ролі на `/admin/users` (`NativeSelect` + `changeRole` → `rpc` клієнтом користувача) і роль у формі
  запрошення; повідомлення `LAST_ADMIN`.
  Done when: AC-USERS-03, AC-USERS-06 у UI.
- [x] 2.3 ADR `docs/decisions/0002-roles-in-table-not-jwt.md`; `docs/conformance.md`; `product/roadmap.md` (WS7 →
  `add-user-invites`); archive `impl-user-invites` в останньому PR зрізу.
  Done when: `npm run ac:coverage` — AC-USERS-01…12 «реалізовано» або «відкладено (причина)».
