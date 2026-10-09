# Матриця відповідності (AC → код → тест → статус)

<!--
Веде розробник у своєму форку. Один рядок на кожен AC з openspec/specs/** (версія — у .spec-source).
Оновлюється в тому самому PR, що й код. Перебудувати автоматично: /conformance (Claude Code, Cursor).
Перевірка в CI: npm run ac:coverage — падає, якщо
  NO-ROW     AC є в специфікації, а рядка немає (типово — після синхронізації нової версії спеки);
  MISSING    статус «реалізовано», а непропущеного тесту з цим AC ID у назві немає;
  ORPHAN     тест посилається на AC, якого немає в специфікації;
  BAD-STATUS статус не «реалізовано» і не «відкладено (причина)».

Приклад рядка (усередині коментаря — скрипт його не читає):
| AC-LEAVE-02 | заявка на дві посади дає два записи main і additional | `src/app/requests/actions.ts` (createRequest) | `tests/requests.test.ts` | реалізовано |
| AC-LEAVE-04 | заблоковані дні не рахуються | — | — | відкладено (чекаємо відповідь PM на Q2, owner/repo#5) |
-->

Версія специфікації: spec-v0.1

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-LEAVE-01 | заявка на одну посаду: одна заявка `pending`, один запис `main` | `src/lib/leave/submission.ts` (validateSubmission), `src/app/requests/actions.ts` (createLeaveRequest), `supabase/migrations/20261013000000_leave_requests.sql` (submit_leave_request) | `tests/leave/submission.test.ts` | реалізовано |
| AC-LEAVE-02 | позначені обидві посади → два записи `main` і `additional` в одній заявці (Q1: галочки) | `src/lib/leave/records.ts` (splitIntoRecords), `src/app/requests/new/page.tsx` | `tests/leave/submission.test.ts` | реалізовано |
| AC-LEAVE-03 | дата кінця раніша за дату початку → `INVALID_RANGE`, до бази не доходимо; check у базі | `src/lib/leave/submission.ts` (validateDates), `supabase/migrations/20261013000000_leave_requests.sql` (leave_requests_range_check) | `tests/leave/submission.test.ts` | реалізовано |
| AC-LEAVE-04 | заблокований 05.11 у заявці 04–06.11 не рахується: 2 дні з 3 (Q2: заявку приймаємо) | `src/lib/leave/blocked-days.ts` (countLeaveDays), `src/app/requests/page.tsx` | `tests/leave/blocked-days.test.ts` | реалізовано |
| AC-LEAVE-05 | запис іде в чергу менеджера підрозділу своєї посади (Q3); у базі — RLS за division_id | `src/lib/leave/routing.ts` (routeRecords), `supabase/migrations/20261013000000_leave_requests.sql` (leave_records_select_own_division_or_admin), `src/app/manage/page.tsx` | `tests/leave/routing.test.ts` | реалізовано |
| AC-LEAVE-06 | схвалення → `approved`; хто і коли ставить тригер set_decision_fields | `src/lib/leave/decisions.ts` (decide), `src/app/manage/actions.ts` (decideRecord), `supabase/migrations/20261013000000_leave_requests.sql` | `tests/leave/decisions.test.ts` | реалізовано |
| AC-LEAVE-07 | повернення без коментаря → `COMMENT_REQUIRED`; з коментарем → `needs_revision`; check у базі | `src/lib/leave/decisions.ts` (decide), `supabase/migrations/20261013000000_leave_requests.sql` (leave_records_comment_check) | `tests/leave/decisions.test.ts` | реалізовано |
| AC-LEAVE-08 | виправлена заявка на доопрацюванні знову `pending` у тій самій черзі | `src/lib/leave/decisions.ts` (resubmit), `src/app/requests/actions.ts` (resubmitLeaveRequest), `supabase/migrations/20261013000000_leave_requests.sql` (resubmit_records) | `tests/leave/decisions.test.ts` | реалізовано |
| AC-LEAVE-09 | доменне правило видимості; у базі те саме — політики RLS (перевірка трьома користувачами — RUNBOOK) | `src/lib/leave/access.ts` (canViewRecord), `supabase/migrations/20261013000000_leave_requests.sql` (політики select) | `tests/leave/access.test.ts` | реалізовано |
