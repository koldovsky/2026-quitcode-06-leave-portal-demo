# Пропозиція розробника: реалізація зрізу «Запрошення користувачів і ролі»

## Why

Специфікація `openspec/specs/user-management/spec.md` (переклад вимоги PM `requirements/01-user-invites.md`,
AC-USERS-01 … AC-USERS-12) готова. Ця зміна — технічний план: як реалізувати запрошення посиланням для активації,
активацію з паролем і ролі в Next.js + Supabase так, щоб кожен AC мав код, тест і рядок у `docs/conformance.md`.
Зріз іде після PR «Дизайн-система»: нові сторінки одразу на токенах і компонентах `@/components/ui`.

## What Changes

- Автентифікація (PR «Реалізація: запрошення»): AC-USERS-01, AC-USERS-02, AC-USERS-04, AC-USERS-05, AC-USERS-07,
  AC-USERS-08, AC-USERS-10, AC-USERS-11, AC-USERS-12.
- Авторизація (PR «Реалізація: ролі»): AC-USERS-03, AC-USERS-06, AC-USERS-09, а також базові відмови AC-USERS-08 і
  AC-USERS-10 для зміни ролі.

## Capabilities

### New Capabilities

— (поведінку описує `user-management`; ця зміна її не змінює, тому `skip_specs: true`)

### Modified Capabilities

—
