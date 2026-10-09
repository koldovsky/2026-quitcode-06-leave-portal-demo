# Пропозиція розробника: синхронізація реалізації зі spec-v0.2

## Why

PM випустив spec-v0.2 (зміна `clarify-leave-rules`): два нові AC і три змінені вимоги. Після синхронізації
`npm run ac:coverage` падає з NO-ROW для AC-LEAVE-10 і AC-LEAVE-11 (`docs/demo/drift-ci.txt`). Ця зміна
доводить реалізацію до spec-v0.2.

## What Changes

- AC-LEAVE-10: діапазон лише із заблокованих днів → `ONLY_BLOCKED_DAYS` (подання й повторне подання).
- AC-LEAVE-11: перетин із власною заявкою на розгляді чи схваленою → `OVERLAPPING_REQUEST`.
- AC-LEAVE-01 (MODIFIED): необов'язкове поле «Заміна» у формі, базі, списку й черзі менеджера.
- AC-LEAVE-02, AC-LEAVE-04, AC-LEAVE-05 (MODIFIED): поведінка вже збігається з робочими рішеннями Q1–Q3 —
  оновлюємо лише назви тестів і рядки матриці під нові формулювання.

## Capabilities

### New Capabilities

— (`skip_specs: true`: специфікацію змінює PM, тут лише реалізація)

### Modified Capabilities

—

## Impact

- Нова міграція `supabase/migrations/20261016000000_leave_rules_v0_2.sql` (застосовану міграцію не редагуємо).
- `src/lib/leave/**`, `src/app/requests/**`, `src/app/manage/page.tsx`, `tests/leave/**`, `docs/conformance.md`.
