# Пропозиція розробника: правила подання — і в базі, а не лише в server action

## Why

На репетиції 11.10.2026 на справжньому Supabase скрипт синтетичними користувачами викликав
`submit_leave_request` напряму з власною сесією (публічний ключ є в JS-бандлі прод-URL). Перетин із власною
заявкою на розгляді (AC-LEAVE-11) і діапазон лише із заблокованих днів (AC-LEAVE-10) зберігались: ці перевірки
жили тільки в server action (`checkCalendar`), а функція подання перевіряла лише, що посади належать працівнику.
Так само два одночасні подання могли обійти перевірку перетину.

## What Changes

- Нова міграція `20261019000000_enforce_leave_rules_in_db.sql`: `submit_leave_request` (`create or replace`,
  GRANT зберігаються) відхиляє `INVALID_RANGE` (AC-LEAVE-03), `ONLY_BLOCKED_DAYS` (AC-LEAVE-10),
  `OVERLAPPING_REQUEST` (AC-LEAVE-11) і бере `pg_advisory_xact_lock` на працівника.
- `src/app/requests/actions.ts`: `dbErrorCode` розпізнає ці коди, тож гонка двох подань показує те саме
  повідомлення, що й перевірка server action.
- Тести бази AC-LEAVE-03, AC-LEAVE-10, AC-LEAVE-11 у `tests/db/leave-db.test.ts` (без міграції — червоні).
- `docs/conformance.md`: рядки AC-LEAVE-03, -10, -11 називають міграцію й тести бази.

## Capabilities

### New Capabilities

— (`skip_specs: true`: поведінка зі spec-v0.2 не змінюється, лише її захист у базі)

### Modified Capabilities

—

## Users & roles

Працівник (`employee`) — той, хто подає заявку; менеджери й адміністратор не змінюються.

## Non-goals

Повторне подання (`resubmitLeaveRequest`, AC-LEAVE-08) — окремий шлях оновлення, його перевірки лишаються в
server action; винести їх у базу — наступна зміна, якщо знадобиться.

## Assumptions

Заявка, у якої хоч один запис на доопрацюванні, не блокує нову — так само, як `requestStatus` у
`src/lib/leave/decisions.ts`.

## Open questions

—

## Impact

- `supabase/migrations/20261019000000_enforce_leave_rules_in_db.sql` (нова; застосовані не редагуємо).
- `src/app/requests/actions.ts`, `tests/db/leave-db.test.ts`, `docs/conformance.md`, `docs/demo/RUNBOOK.md` (шість міграцій).
