# Пропозиція розробника: реалізація зрізу «Подання заявки і рішення менеджера»

## Why

PM випустив специфікацію `leave-requests` (spec-v0.1, AC-LEAVE-01 … AC-LEAVE-09) і відповів на питання
Q1–Q5 (`product/decisions.md`). Ця зміна — технічний план і задачі розробника: як реалізувати зріз у
Next.js + Supabase так, щоб кожен AC мав код, тест і рядок у `docs/conformance.md`.

## What Changes

- Ролі `employee`, `manager`, `admin` замість ролей шаблону; таблиці підрозділів, посад, заблокованих днів,
  заявок і записів заявок з RLS (AC-LEAVE-01 … AC-LEAVE-09).
- Доменний модуль `src/lib/leave/` з юніт-тестами, назви яких починаються з AC ID.
- Сторінки `/requests/new`, `/requests`, `/manage` і server actions.
- Синтетичні користувачі: працівник із двома посадами в різних підрозділах, два менеджери, адміністратор.

## Capabilities

### New Capabilities

— (поведінку описує специфікація PM `leave-requests`; ця зміна її не змінює, тому `skip_specs: true`)

### Modified Capabilities

—

## Impact

- `supabase/migrations/20261013000000_leave_requests.sql`, `supabase/seed.sql`, `supabase/demo-users.json`,
  `scripts/create-demo-users.mjs`, `src/lib/leave/**`, `src/app/{requests,manage}/**`, `tests/leave/**`,
  `docs/conformance.md`.
