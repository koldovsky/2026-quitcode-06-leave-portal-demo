# Design: harden-leave-db

## Context

- Реалізація spec-v0.2 (`docs/conformance.md`: AC-LEAVE-01 … 11 «реалізовано»).
- Частину правил виконує лише база: видимість і черги (RLS, AC-LEAVE-05, 09), хто і коли вирішив (тригер
  `private.set_decision_fields`, AC-LEAVE-06), обов'язковий коментар (check, AC-LEAVE-07), повторне подання
  (політика + тригер `private.resubmit_records`, AC-LEAVE-08). До цієї зміни тестів бази не було
  (Risks у `design.md` зміни `impl-leave-request`): pgTAP потребує `supabase start` і Docker.

## Goals / Non-Goals

**Goals:**

- Заявка без записів не зберігається жодним шляхом — і через функцію подання, і прямим запитом до Data API.
- Кожне правило бази з AC має автоматичний тест, назва якого несе AC ID; `ac:coverage` зеленіє лише через нього.

**Non-Goals:**

- AC-LEAVE-10/11 у базі (рішення зміни `impl-clarify-leave-rules` — лише server action — не змінюємо).
- Тести на справжньому Supabase (Auth, PostgREST): їх замінює ручна перевірка з RUNBOOK 1.5.

## Decisions

1. **Відкладений constraint trigger, а не `revoke insert`.** `submit_leave_request` — `security invoker`:
   працює з правами користувача, тож потребує `GRANT insert`. Забрати grant означало б перевести функцію на
   `security definer` і переписати в ній усі перевірки RLS вручну. Натомість
   `create constraint trigger … after insert … deferrable initially deferred` перевіряє наявність записів на
   COMMIT: функція подання вставляє заявку й записи в одній транзакції (проходить), а кожен запит Data API —
   окрема транзакція (падає з `REQUEST_WITHOUT_RECORDS`, SQLSTATE 23514). Функція тригера — у `private`,
   `security definer`, `search_path = ''`, `revoke execute` від `public, anon, authenticated`.
   Видалення заявок тригер не зачіпає (лише insert) — скидання бази після репетиції працює як раніше.
2. **PGlite замість pgTAP.** `@electric-sql/pglite` 0.5.8 (точна версія) — справжній Postgres, зібраний у WASM;
   працює у Vitest без Docker, локально й у CI. Ролі Supabase емулюємо: `anon`, `authenticated`,
   `service_role` (bypassrls), `supabase_auth_admin`, схема `auth` з `auth.users` і `auth.uid()` з
   `request.jwt.claim.sub`. Застосовуємо ті самі файли `supabase/migrations/*.sql` і `supabase/seed.sql`.
   Межа: Auth, PostgREST і JWT не емулюються повністю — їх перевіряє репетиція.
3. **Мертвий код видаляємо.** `routeRecords`/`managerOf` і `canViewRecord` дублювали RLS, але застосунок їх
   не викликав — тести на них давали хибне покриття. `canDecideRecord` лишається (ним сторінка вирішує,
   де показати кнопки). `decide()` повертає лише статус і коментар.

| AC | Хто виконує правило | Тест |
|---|---|---|
| AC-LEAVE-01 | функція `submit_leave_request` + тригер `leave_requests_require_records` | `tests/db/leave-db.test.ts` |
| AC-LEAVE-05 | політики `leave_records_select_own_division_or_admin`, `leave_records_update_division_manager` | `tests/db/leave-db.test.ts` |
| AC-LEAVE-06 | тригер `private.set_decision_fields`, колонкові GRANT | `tests/db/leave-db.test.ts` |
| AC-LEAVE-07 | check `leave_records_comment_check` (+ `decide()` у server action) | обидва |
| AC-LEAVE-08 | політика `leave_requests_update_own_needs_revision`, тригер `private.resubmit_records` | обидва |
| AC-LEAVE-09 | політики select на `leave_requests`, `leave_records`, `profiles` | `tests/db/leave-db.test.ts` |

## Risks / Trade-offs

- PGlite ≠ хмарний Supabase: розширення, Auth і PostgREST інші. Тест ловить регресії політик і тригерів,
  але не налаштування проєкту (Confirm email, реєстрація, Redirect URLs) — їх перевіряє RUNBOOK 1.5.
- Тест бази додає ~2–3 с до `npm test` (ініціалізація WASM).
