# Design: impl-leave-request

## Context

- Специфікація: `openspec/specs/leave-requests/spec.md` (spec-v0.1), AC-LEAVE-01 … AC-LEAVE-09.
- Відповіді PM на Q1–Q5 — у `product/decisions.md`; у специфікацію вони потраплять у spec-v0.2.
  Ця зміна реалізує spec-v0.1 і там, де v0.1 неоднозначна, бере відповідь PM (вона ж — рекомендований
  варіант із `docs/spec-reading.md`):
  - Q1 → записи створюються лише для посад, які працівник позначив галочками (AC-LEAVE-02);
  - Q2 → заявку із заблокованим днем приймаємо, заблоковані дні не входять у кількість днів (AC-LEAVE-04);
  - Q3 → кожен запис іде менеджеру підрозділу своєї посади, рішення — на рівні запису (AC-LEAVE-05 … 07).
  - Q4 (заміна) і Q5 (перетин заявок) у spec-v0.1 не описані — не реалізуємо до spec-v0.2.
- Стек фіксований (AGENTS.md): Next.js 16 App Router без Cache Components, Supabase без Docker
  (міграції → `db push`), Vitest для юніт-тестів.

## Goals / Non-Goals

**Goals:**

- Кожен AC-LEAVE-01 … 09: код + тест з AC ID у назві + рядок «реалізовано» в `docs/conformance.md`.
- Права з `product/roles.md` у базі: RLS на кожній таблиці, явні GRANT, колонкові GRANT проти
  самопідвищення (роль) і самосхвалення (статус).
- Подання заявки атомарне: заявка без записів не зберігається.

**Non-Goals:**

- Екрани адміністратора (календар, підрозділи, посади) — зріз WS7; дані — сидом і скриптом.
- Листи й повідомлення, скасування заявки, Direct Edit менеджером (Non-goals PM).
- Тести бази в CI (pgTAP потребує `supabase start` з Docker) — див. Risks.

## Decisions

### 1. Модель даних (міграція `20261013000000_leave_requests.sql`)

| Таблиця | Ключові колонки | AC |
|---|---|---|
| `profiles` (шаблон) | `role` ∈ employee / manager / admin; default `employee` | усі |
| `divisions` | `code` (унікальний), `name`, `manager_id` → profiles | 05 |
| `positions` | `employee_id`, `division_id`, `kind` main/additional, `title`; unique (`employee_id`, `kind`) | 01, 02 |
| `blocked_days` | `day` (PK), `reason` | 04 |
| `leave_requests` | `employee_id` (default `auth.uid()`), `leave_type`, `start_date`, `end_date`; check `end_date >= start_date` | 01–03, 08 |
| `leave_records` | `request_id`, `position_id`, `kind`, `division_id` (копія з посади), `status`, `decided_by`, `decided_at`, `comment` | 01, 02, 05–08 |

- Статус — на рівні **запису**, статус заявки похідний (`requestStatus`: needs_revision > approved (усі) > pending).
- Кількість днів не зберігаємо: її рахує `countLeaveDays` з дат і `blocked_days` під час показу.
- Роль змінюємо в порядку: `update … 'member' → 'employee'` → `set default 'employee'` → новий constraint.
  Інакше тригер `on_auth_user_created` вставить профіль із `member`, і `createUser` впаде.
- Check-обмеження дублюють доменні правила там, де їх дешево тримати в базі: діапазон дат (AC-03),
  рішення має автора й час (AC-06), `needs_revision` лише з коментарем (AC-07).

### 2. Права: GRANT + RLS

| Таблиця | select | insert | update | delete |
|---|---|---|---|---|
| `divisions` | усі | admin | admin | admin |
| `positions` | власні / менеджер підрозділу / admin | admin | admin | admin |
| `blocked_days` | усі | admin | — | admin |
| `leave_requests` | власні / менеджер, у чиїй черзі запис / admin | employee від свого імені (колонки `leave_type`, дати) | власна заявка на доопрацюванні (колонки `leave_type`, дати) | — |
| `leave_records` | власник заявки / менеджер підрозділу запису / admin | власник заявки, лише для власної посади з її підрозділом | менеджер підрозділу, лише `pending` → `approved`/`needs_revision` (колонки `status`, `comment`) | — |

- Хелпери в `private` (`security definer`, `search_path = ''`): `is_division_manager`, `owns_request`,
  `manages_request`, `manages_employee`, `request_needs_revision`, `position_is_mine` — щоб політики
  `leave_requests` ↔ `leave_records` не посилались одна на одну напряму (рекурсія 42P17).
- `decided_by`/`decided_at` ставить тригер `private.set_decision_fields` з `auth.uid()` і `now()`:
  клієнт їх не передає й не має на них GRANT.
- Повторне подання (AC-08): працівник оновлює лише власну заявку; тригер `private.resubmit_records`
  (`security definer`) повертає всі її записи в `pending` і очищує рішення (власне припущення в
  `docs/spec-reading.md`).
- Профілі: менеджер бачить профілі працівників, чиї записи в його черзі (ім'я в черзі).

### 3. Подання заявки — одна транзакція

`public.submit_leave_request(p_leave_type, p_start_date, p_end_date, p_position_ids uuid[])`:
`security invoker` (діють GRANT і RLS користувача), вставляє заявку й записи з даних посад; якщо хоч
одна посада не належить користувачу — `UNKNOWN_POSITION`, і транзакція відкочується. Перевірки
дат і посад з повідомленнями для користувача — у server action через доменний модуль, до виклику бази.

### 4. Доменний модуль `src/lib/leave/` (чистий TypeScript, без Supabase)

| Файл | Що робить | AC |
|---|---|---|
| `submission.ts` | `validateDates`, `validateSubmission` | 01–03 |
| `records.ts` | `splitIntoRecords` — запис на кожну позначену посаду | 01, 02 |
| `blocked-days.ts` | `countLeaveDays` — календарні дні мінус заблоковані | 04 |
| `routing.ts` | `managerOf`, `routeRecords` — черги менеджерів | 05 |
| `decisions.ts` | `decide`, `requestStatus`, `resubmit` | 06–08 |
| `access.ts` | `canViewRecord`, `canDecideRecord` — те саме правило, що й RLS | 09 |
| `messages.ts` | українські підписи й тексти помилок | — |

### 5. Server actions і сторінки

| Сторінка | Хто | Server action |
|---|---|---|
| `/requests/new` | employee | `createLeaveRequest` → `validateSubmission` → `rpc('submit_leave_request')` |
| `/requests` | employee | `resubmitLeaveRequest` → `resubmit` → `update leave_requests` |
| `/manage` | manager (рішення), admin (лише перегляд) | `decideRecord` → `decide` → `update leave_records (status, comment)` |

Помилки повертаємо кодом у `?error=` (коди зі специфікації: `INVALID_RANGE`, `COMMENT_REQUIRED`).
Роль і підрозділи менеджера — `src/lib/supabase/viewer.ts` (`getClaims()`, не `getSession()`).

### 6. Тести

- Юніт-тести `tests/leave/*.test.ts`: назви починаються з AC ID (`it("AC-LEAVE-04: …")`).
- RLS і тригери перевіряємо двома шляхами: перед заняттям — вручну у хмарному проєкті під трьома
  демо-користувачами (`docs/demo/RUNBOOK.md`); автоматичні тести бази (pgTAP, `supabase test db`) — коли
  в команди буде Docker.

### 7. Демо-дані

Сид (`db push --include-seed`): підрозділи MATH «Математика», PRIMARY «Початкова школа»; заблокований
день 05.11.2026. Скрипт `npm run users:demo` (`supabase/demo-users.json`): адміністратор, два менеджери
(`manages`), працівник з основною посадою в MATH і додатковою в PRIMARY, працівниця з однією посадою в PRIMARY.

## Risks / Trade-offs

- Перевірки, яких немає в базі (тип посади в заявці, майбутні ONLY_BLOCKED_DAYS / OVERLAPPING_REQUEST),
  живуть у server action: прямий запит до Data API в обхід сторінок їх оминає. Прийнятно для навчального
  зрізу; критичні правила (діапазон, рішення, коментар, хто вирішив) — у базі.
- Працівник прямим запитом може додати запис для власної другої посади до вже поданої заявки (політика
  insert перевіряє лише власника й посаду). Закриємо, якщо PM додасть зміну набору посад у заявці.
- `database.types.ts` написано вручну до першого `db push`; після нього — `npm run db:types`.
- Тестів бази в CI немає: RLS ламається непомітно, якщо не пройти ручну перевірку з RUNBOOK.
