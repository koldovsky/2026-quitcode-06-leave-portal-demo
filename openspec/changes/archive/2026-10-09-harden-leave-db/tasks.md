# Tasks

Перевірка кожної задачі — `npm test` і `npm run ac:coverage`.

## 1. Атомарне подання

- [x] 1.1 Міграція `20261017000000_require_leave_records.sql`: відкладений constraint trigger
  `leave_requests_require_records` (функція `private.require_leave_records`, `security definer`, `revoke execute`).
  Done when: AC-LEAVE-01 — подання функцією дає заявку з записом; прямий insert заявки без записів падає
  з `REQUEST_WITHOUT_RECORDS`, нічого не збережено.

## 2. Тести бази

- [x] 2.1 `tests/db/supabase-pglite.ts`: PGlite, ролі Supabase, `auth.users`/`auth.uid()`, усі міграції й сид,
  п'ять синтетичних користувачів як у `supabase/demo-users.json`.
- [x] 2.2 `tests/db/leave-db.test.ts`: черги за підрозділом, хто і коли вирішив, коментар, повторне подання,
  видимість для працівника, менеджера й адміністратора.
  Done when: AC-LEAVE-05, AC-LEAVE-06, AC-LEAVE-09 — тести бази зелені; AC-LEAVE-07, 08 — додатково на рівні бази.

## 3. Чесна матриця

- [x] 3.1 Видалити `src/lib/leave/routing.ts`, `canViewRecord` і їхні тести; `decide()` без `actorId`/`now`.
- [x] 3.2 `docs/conformance.md`: «Код» і «Тест» для AC-LEAVE-05, 06, 09 — політики, тригер, `tests/db/leave-db.test.ts`.
  Done when: `npm run ac:coverage` — OK, і AC-LEAVE-05/06/09 в назвах є лише в тестах бази.

## Workflow follow-up

- `npx openspec archive harden-leave-db -y` в останньому PR зміни, до merge.
