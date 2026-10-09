# Design: impl-clarify-leave-rules

## Context

- Специфікація: spec-v0.2 (`openspec/specs/leave-requests/spec.md`), що змінилось — `openspec show --diff`
  до archive (`docs/demo/spec-v0.2-diff.txt`) і `product/CHANGELOG.md`.
- `ac:coverage` ловить лише нові AC (NO-ROW для AC-LEAVE-10, AC-LEAVE-11). Змінений зміст MODIFIED-сценаріїв
  він не бачить: AC-LEAVE-01/02/04/05 мають рядки й тести, тож перевірка «зелена» навіть зі старою поведінкою.
  Тому кожен MODIFIED-сценарій звіряємо з кодом вручну (таблиця нижче).

| AC | Що змінилось у spec-v0.2 | Наша реалізація spec-v0.1 | Що робимо |
|---|---|---|---|
| AC-LEAVE-01 | заміна — необов'язкове текстове поле | поля немає | нова колонка, поле форми, показ |
| AC-LEAVE-02 | посади — галочками; «покриває» = розклад за обома | галочки (робоче рішення Q1) | лише назва тесту |
| AC-LEAVE-04 | заявку прийнято, 2 дні з 3 | так само (робоче рішення Q2) | тест «заявку прийнято» |
| AC-LEAVE-05 | кожен запис — у черзі свого підрозділу | так само (робоче рішення Q3) | без змін |
| AC-LEAVE-10 | нове: лише заблоковані дні → `ONLY_BLOCKED_DAYS` | немає | перевірка + тест |
| AC-LEAVE-11 | нове: перетин → `OVERLAPPING_REQUEST` | немає | перевірка + тест |

## Goals / Non-Goals

**Goals:** AC-LEAVE-01 … 11 «реалізовано» з тестами; `ac:coverage` зелений.

**Non-Goals:** перевірки в базі для AC-LEAVE-10/11 (обмеження exclusion за датами й статусом записів
ускладнило б міграцію; для навчального зрізу — у server action, як у design.md зміни `impl-leave-request`).

## Decisions

1. **Міграція `20261016000000_leave_rules_v0_2.sql`** (нова, попередню не редагуємо):
   - `leave_requests.substitute_note text` з check `char_length <= 200` (наше обмеження; у спеці межі немає);
   - колонкові GRANT `insert (substitute_note)`, `update (substitute_note)` для `authenticated`;
   - `submit_leave_request` отримує `p_substitute_note text default null`: стару сигнатуру видаляємо
     (`drop function`), нову створюємо з тими самими `revoke`/`grant`.
2. **Доменний модуль:**
   - `calendar.ts` → `checkCalendar(range, { blockedDays, existing, excludeRequestId })`: спершу
     `ONLY_BLOCKED_DAYS` (усі дні діапазону заблоковані), потім `OVERLAPPING_REQUEST` (перетин хоча б в один
     день із власною заявкою, статус якої — `pending` або `approved`; `needs_revision` не блокує);
   - `submission.ts` → `normalizeSubstitute`: порожній рядок → `null`, понад 200 символів → `SUBSTITUTE_TOO_LONG`.
3. **Server actions:** `createLeaveRequest` і `resubmitLeaveRequest` читають заблоковані дні й власні заявки
   (з їхніми записами — щоб обчислити статус) і викликають `checkCalendar`; повторне подання виключає саму
   заявку (`excludeRequestId`) — інакше вона «перетнулась би» сама з собою.
4. **Сторінки:** поле «Заміна (необов'язково)» на `/requests/new` і у формі виправлення; заміну видно
   працівнику на `/requests` і менеджеру на `/manage`.

## Risks / Trade-offs

- Дві заявки, подані одночасно з двох вкладок, обидві пройдуть перевірку перетину (немає обмеження в базі).
  Прийнятно для зрізу; якщо PM зробить це критичним — exclusion constraint або перевірка в
  `submit_leave_request`.
- Власне припущення: перетин перевіряємо й під час повторного подання (AC-LEAVE-08), а не лише для нової
  заявки, — записано в `docs/spec-reading.md`.
