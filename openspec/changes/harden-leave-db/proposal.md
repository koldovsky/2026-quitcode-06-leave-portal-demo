# Пропозиція розробника: правила бази — під тести, заявка без записів — заборонена

## Why

Рев'ю реалізації spec-v0.2 знайшло два розриви між тим, що ми заявили, і тим, що перевіряємо:

- **Подання не атомарне в обхід сторінок.** `design.md` зміни `impl-leave-request` обіцяє «заявка без записів
  не зберігається», але колонковий `GRANT insert` і політика `leave_requests_insert_employee` дозволяють
  працівникові вставити заявку напряму через Data API, без жодного запису. Така заявка вічно «на розгляді»
  (`requestStatus([])` → `pending`), блокує ті самі дати через `OVERLAPPING_REQUEST` (AC-LEAVE-11), і її не
  видалити (політики delete немає).
- **Покриття за назвою.** AC-LEAVE-05 і AC-LEAVE-09 «покриті» тестами `routeRecords` і `canViewRecord`, яких
  жоден рядок застосунку не викликає; насправді ці правила виконує RLS, а її тестів немає. Тест AC-LEAVE-06
  перевіряв, що `decide()` повертає `actorId` і `now`, які server action відкидає: хто і коли ставить тригер.
  `npm run ac:coverage` лишався зеленим за будь-якої поведінки бази.

## What Changes

- Нова міграція `20261017000000_require_leave_records.sql`: відкладений constraint trigger
  `leave_requests_require_records` — на COMMIT у заявки має бути хоч один запис, інакше `REQUEST_WITHOUT_RECORDS`.
- Тести бази в `npm test` і CI: `tests/db/leave-db.test.ts` застосовує всі міграції й сид у PGlite
  (`@electric-sql/pglite`, Postgres у WASM, без Docker) з емульованими ролями Supabase і перевіряє RLS,
  тригери й check-обмеження. Назви тестів несуть AC-LEAVE-01, 05, 06, 07, 08, 09.
- Видаляємо мертвий код: `src/lib/leave/routing.ts` (`routeRecords`, `managerOf`) і `canViewRecord`;
  `decide()` більше не приймає й не повертає «хто і коли».
- `docs/conformance.md`: стовпці «Код» і «Тест» для AC-LEAVE-05, 06, 09 указують на політики, тригер і тест бази.

## Capabilities

### New Capabilities

— (`skip_specs: true`: поведінка зі spec-v0.2 не змінюється, лише її захист і перевірка)

### Modified Capabilities

—

## Impact

- `supabase/migrations/20261017000000_require_leave_records.sql` (нова; застосовані не редагуємо).
- `package.json` (devDependency `@electric-sql/pglite` 0.5.8), `tests/db/**`, `tests/leave/**`, `src/lib/leave/**`,
  `src/app/manage/actions.ts`, `docs/conformance.md`, `docs/demo/RUNBOOK.md`.
