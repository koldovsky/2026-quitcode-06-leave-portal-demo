# Пропозиція розробника: черги на читання — лише для ролі manager

## Why

Зміна `harden-leave-db` додала перевірку ролі лише в політику рішення (`leave_records_update_division_manager`).
Політики читання й далі покладаються на хелпери `private.is_division_manager`, `private.manages_request`,
`private.manages_employee`, які дивляться лише на `divisions.manager_id`, а він роль не перевіряє. Працівник,
якого адміністратор помилково записав менеджером підрозділу, читав би чергу цього підрозділу: чужі записи,
заявки (зокрема тип «хвороба») і профілі колег. Це суперечить `product/roles.md` (працівник — «R власні»)
і AC-LEAVE-09.

## What Changes

- Нова міграція `20261018000000_manager_helpers_require_role.sql`: три хелпери (`create or replace`, наявні
  GRANT на функції зберігаються) повертають `true` лише для ролі `manager` з `private.current_app_role()`.
- Тест бази AC-LEAVE-09 у `tests/db/leave-db.test.ts`: працівник у `manager_id` не бачить чужих заявок,
  записів і профілів підрозділу (без міграції тест червоний).
- `docs/conformance.md`: рядки AC-LEAVE-05 і AC-LEAVE-09 називають нову міграцію.

## Capabilities

### New Capabilities

— (`skip_specs: true`: поведінка зі spec-v0.2 не змінюється, лише її захист у базі)

### Modified Capabilities

—

## Impact

- `supabase/migrations/20261018000000_manager_helpers_require_role.sql` (нова; застосовані не редагуємо).
- `tests/db/leave-db.test.ts`, `docs/conformance.md`, `docs/demo/RUNBOOK.md` (п'ять міграцій).
