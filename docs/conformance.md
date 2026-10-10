# Матриця відповідності (AC → код → тест → статус)

<!--
Веде розробник у своєму форку. Один рядок на кожен AC з openspec/specs/** (версія — у .spec-source).
Оновлюється в тому самому PR, що й код. Перебудувати автоматично: /conformance (Claude Code, Cursor).
Перевірка в CI: npm run ac:coverage — падає, якщо
  NO-ROW     AC є в специфікації, а рядка немає (типово — після синхронізації нової версії спеки);
  MISSING    статус «реалізовано», а непропущеного тесту в *.test.ts(x), назва якого починається з цього AC ID, немає;
  ORPHAN     тест посилається на AC, якого немає в специфікації;
  BAD-STATUS статус не «реалізовано» і не «відкладено (причина)»;
  WRONG-REF  шляху `src/…`/`tests/…`/`supabase/…` з колонок «Код»/«Тест» немає або тест із цим AC в іншому файлі.

Приклад рядка (усередині коментаря — скрипт його не читає):
| AC-LEAVE-02 | заявка на дві посади дає два записи main і additional | `src/app/requests/actions.ts` (createRequest) | `tests/requests.test.ts` | реалізовано |
| AC-LEAVE-04 | заблоковані дні не рахуються | — | — | відкладено (чекаємо відповідь PM на Q2, owner/repo#5) |
-->

Версія специфікації: spec-v0.2

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-LEAVE-01 | заявка на одну посаду: одна заявка `pending`, один запис `main`; заміна — необов'язковий текст; заявку без записів база не зберігає | `src/lib/leave/submission.ts` (validateSubmission, normalizeSubstitute), `src/app/requests/actions.ts` (createLeaveRequest), `supabase/migrations/20261016000000_leave_rules_v0_2.sql` (substitute_note, submit_leave_request), `supabase/migrations/20261017000000_require_leave_records.sql` (leave_requests_require_records) | `tests/leave/submission.test.ts`, `tests/db/leave-db.test.ts` | реалізовано |
| AC-LEAVE-02 | позначені обидві посади (розклад за обома) → два записи `main` і `additional` в одній заявці | `src/lib/leave/records.ts` (splitIntoRecords), `src/app/requests/new/page.tsx` | `tests/leave/submission.test.ts` | реалізовано |
| AC-LEAVE-03 | дата кінця раніша за дату початку → `INVALID_RANGE`, до бази не доходимо; check у базі | `src/lib/leave/submission.ts` (validateDates), `supabase/migrations/20261013000000_leave_requests.sql` (leave_requests_range_check) | `tests/leave/submission.test.ts` | реалізовано |
| AC-LEAVE-04 | заявку 04–06.11 із заблокованим 05.11 прийнято, днів відсутності — 2 | `src/lib/leave/blocked-days.ts` (countLeaveDays), `src/lib/leave/calendar.ts` (checkCalendar), `src/app/requests/page.tsx` | `tests/leave/blocked-days.test.ts`, `tests/leave/calendar.test.ts` | реалізовано |
| AC-LEAVE-05 | кожен запис — у черзі менеджера підрозділу своєї посади; рішення щодо чужого підрозділу — 0 рядків | `supabase/migrations/20261013000000_leave_requests.sql` (leave_records_select_own_division_or_admin, leave_records_update_division_manager), `src/app/manage/page.tsx` | `tests/db/leave-db.test.ts` | реалізовано |
| AC-LEAVE-06 | схвалення → `approved`; хто і коли ставить тригер, клієнт `decided_by` не записує; заявка схвалена, коли схвалено всі записи | `supabase/migrations/20261013000000_leave_requests.sql` (set_decision_fields, колонкові GRANT, leave_records_update_division_manager), `supabase/migrations/20261017000000_require_leave_records.sql` (у leave_records_update_division_manager — лише роль manager), `src/app/manage/actions.ts` (decideRecord), `src/lib/leave/decisions.ts` (requestStatus) | `tests/db/leave-db.test.ts`, `tests/leave/decisions.test.ts` | реалізовано |
| AC-LEAVE-07 | повернення без коментаря → `COMMENT_REQUIRED`; з коментарем → `needs_revision`; check у базі | `src/lib/leave/decisions.ts` (decide), `supabase/migrations/20261013000000_leave_requests.sql` (leave_records_comment_check) | `tests/leave/decisions.test.ts`, `tests/db/leave-db.test.ts` | реалізовано |
| AC-LEAVE-08 | виправлена заявка на доопрацюванні знову `pending` у тій самій черзі | `src/lib/leave/decisions.ts` (resubmit), `src/app/requests/actions.ts` (resubmitLeaveRequest), `supabase/migrations/20261013000000_leave_requests.sql` (leave_requests_update_own_needs_revision, resubmit_records) | `tests/leave/decisions.test.ts`, `tests/db/leave-db.test.ts` | реалізовано |
| AC-LEAVE-09 | працівник бачить лише власні заявки; менеджер — лише свою чергу; admin — усе, без рішень. Виконує лише RLS; на справжньому Supabase — ще й три користувачі на репетиції (RUNBOOK 1.5) | `supabase/migrations/20261013000000_leave_requests.sql` (політики select на leave_requests, leave_records, profiles), `supabase/migrations/20261017000000_require_leave_records.sql` (admin не вирішує, навіть записавши себе в manager_id) | `tests/db/leave-db.test.ts` | реалізовано |
| AC-LEAVE-10 | діапазон лише із заблокованих днів → `ONLY_BLOCKED_DAYS`, нічого не збережено | `src/lib/leave/calendar.ts` (checkCalendar), `src/app/requests/actions.ts` (createLeaveRequest, resubmitLeaveRequest) | `tests/leave/calendar.test.ts` | реалізовано |
| AC-LEAVE-11 | перетин із власною заявкою `pending`/`approved` → `OVERLAPPING_REQUEST`; `needs_revision` не блокує | `src/lib/leave/calendar.ts` (checkCalendar), `src/app/requests/actions.ts` (createLeaveRequest, resubmitLeaveRequest) | `tests/leave/calendar.test.ts` | реалізовано |
