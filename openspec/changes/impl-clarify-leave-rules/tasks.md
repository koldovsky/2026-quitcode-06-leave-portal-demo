# Tasks

Синхронізація реалізації зі spec-v0.2. Перевірка кожної задачі — `npm test` і `npm run ac:coverage`.

## 1. Нові AC

- [x] 1.1 `checkCalendar`: діапазон лише із заблокованих днів → `ONLY_BLOCKED_DAYS` у `createLeaveRequest` і
  `resubmitLeaveRequest`; повідомлення у формі; тест; рядок у `docs/conformance.md`.
  Done when: AC-LEAVE-10 — заявка 05.11–05.11.2026 відхилена, нічого не збережено.
- [x] 1.2 `checkCalendar`: перетин із власною заявкою `pending`/`approved` → `OVERLAPPING_REQUEST`
  (`needs_revision` не блокує; повторне подання не перетинається само з собою); тест; рядок у матриці.
  Done when: AC-LEAVE-11 — заявка 04.11–06.11 після заявки 03.11–04.11 відхилена.

## 2. Змінені AC

- [x] 2.1 Міграція `20261016000000_leave_rules_v0_2.sql` (колонка `substitute_note`, GRANT, нова сигнатура
  `submit_leave_request`); `normalizeSubstitute`; поле «Заміна» у формах, показ на `/requests` і `/manage`;
  `database.types.ts`; тест.
  Done when: AC-LEAVE-01 — заявка без заміни приймається, із заміною — зберігає її.
- [x] 2.2 Звірити AC-LEAVE-02, AC-LEAVE-04, AC-LEAVE-05 зі spec-v0.2 (таблиця в design.md), оновити назви
  тестів і рядки матриці; версія в `docs/conformance.md` — spec-v0.2.
  Done when: AC-LEAVE-02, AC-LEAVE-04, AC-LEAVE-05 — тести відповідають новим формулюванням; `npm run ac:coverage` — OK.

## Workflow follow-up

- `npx openspec archive impl-clarify-leave-rules -y` в останньому PR синхронізації, до merge.
