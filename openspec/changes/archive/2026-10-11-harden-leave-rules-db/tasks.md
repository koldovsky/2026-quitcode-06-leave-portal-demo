# Tasks

Перевірка кожної задачі — `npm test` і `npm run ac:coverage`.

## 1. Правила подання в базі

- [x] 1.1 Міграція `20261019000000_enforce_leave_rules_in_db.sql`: `submit_leave_request` відхиляє
  `INVALID_RANGE`, `ONLY_BLOCKED_DAYS`, `OVERLAPPING_REQUEST`; блокування на працівника.
  Done when: AC-LEAVE-03, AC-LEAVE-10, AC-LEAVE-11 — тести бази зелені з міграцією й червоні без неї.
- [x] 1.2 `dbErrorCode` у `src/app/requests/actions.ts` розпізнає нові коди.
  Done when: `npm run typecheck` і `npm run build` — OK.

## 2. Матриця

- [x] 2.1 `docs/conformance.md`: «Код» і «Тест» для AC-LEAVE-03, -10, -11 — міграція й `tests/db/leave-db.test.ts`.
  Done when: `npm run ac:coverage` — OK.

## Workflow follow-up

- `npx openspec archive harden-leave-rules-db -y` в останньому PR зміни, до merge.
