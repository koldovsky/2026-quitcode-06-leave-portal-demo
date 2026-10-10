# Tasks

Перевірка кожної задачі — `npm test` і `npm run ac:coverage`.

## 1. Хелпери черг перевіряють роль

- [x] 1.1 Міграція `20261018000000_manager_helpers_require_role.sql`: `private.is_division_manager`,
  `private.manages_request`, `private.manages_employee` — `current_app_role() = 'manager'` і `manager_id`.
  Done when: AC-LEAVE-09 — працівник, якого записали в `manager_id`, бачить 0 чужих записів, заявок і
  профілів; черги справжніх менеджерів (AC-LEAVE-05) не змінились.

## 2. Матриця

- [x] 2.1 `docs/conformance.md`: «Код» для AC-LEAVE-05 і AC-LEAVE-09 — нова міграція.
  Done when: `npm run ac:coverage` — OK.

## Workflow follow-up

- `npx openspec archive harden-manager-reads -y` в останньому PR зміни, до merge.
