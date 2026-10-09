# Tasks

Вертикальні задачі: кожна — таблиця/RLS + доменна функція + server action/сторінка + тест.
Кожна закінчується рядком «Done when» з AC ID; перевірка — `npm test`, `npm run ac:coverage`.

## 1. Основа: ролі, довідники, демо-дані

- [x] 1.1 Міграція: ролі `employee`/`manager`/`admin` (дані → default → constraint), таблиці `divisions`,
  `positions`, `blocked_days` з RLS і GRANT; сид підрозділів і заблокованого дня; `demo-users.json` і
  `scripts/create-demo-users.mjs` з `manages` і `positions`; `database.types.ts`.
  Done when: `npm run typecheck` зелений; у хмарі `db push --include-seed` → `users:demo` створює 5 користувачів (RUNBOOK).

## 2. Подання заявки

- [x] 2.1 Таблиці `leave_requests`, `leave_records`, функція `submit_leave_request`; `validateSubmission`
  і `splitIntoRecords`; сторінка `/requests/new` (тип, дати, галочки посад) і `createLeaveRequest`; тести.
  Done when: AC-LEAVE-01, AC-LEAVE-02 — тести зелені, заявка на дві посади дає два записи.
- [x] 2.2 Check `end_date >= start_date` у базі + `validateDates` → `INVALID_RANGE` до запису в базу; тест.
  Done when: AC-LEAVE-03.

## 3. Заблоковані дні

- [x] 3.1 `countLeaveDays` (календарні дні мінус заблоковані) і показ кількості днів на `/requests` і `/manage`; тест.
  Done when: AC-LEAVE-04 — заявка 04.11–06.11.2026 з заблокованим 05.11 має 2 дні.

## 4. Черга менеджера й рішення

- [x] 4.1 Політики `leave_records`/`leave_requests` за підрозділом запису; `routeRecords`; сторінка `/manage`; тест.
  Done when: AC-LEAVE-05 — запис основної посади в черзі менеджера «Математики», додаткової — «Початкової школи».
- [x] 4.2 Колонковий GRANT (`status`, `comment`), політика update для менеджера, тригер `set_decision_fields`;
  `decide` і `decideRecord`; кнопка «Схвалити»; тест.
  Done when: AC-LEAVE-06 — `approved`, `decided_by`, `decided_at`.
- [x] 4.3 Check «needs_revision лише з коментарем»; `decide('return')` → `COMMENT_REQUIRED`; форма повернення з коментарем; тест.
  Done when: AC-LEAVE-07.

## 5. Повторне подання

- [x] 5.1 Політика update власної заявки на доопрацюванні, тригер `resubmit_records`; `resubmit` і
  `resubmitLeaveRequest`; форма виправлення на `/requests`; тест.
  Done when: AC-LEAVE-08 — після виправлення заявка знову `pending` у черзі того самого менеджера.

## 6. Доступ

- [x] 6.1 Політики select для всіх таблиць зрізу; `canViewRecord`/`canDecideRecord`; кнопки рішення лише
  в менеджера підрозділу; тест; ручна перевірка трьома користувачами (RUNBOOK).
  Done when: AC-LEAVE-09.

## 7. Матриця відповідності

- [x] 7.1 Рядки AC-LEAVE-01 … 09 у `docs/conformance.md` зі статусом «реалізовано».
  Done when: `npm run ac:coverage` — OK.

## Workflow follow-up

- `npx openspec archive impl-leave-request -y` в останньому PR зрізу, до merge.
- Нова версія спеки (spec-v0.2) — окрема зміна розробника після синхронізації.
