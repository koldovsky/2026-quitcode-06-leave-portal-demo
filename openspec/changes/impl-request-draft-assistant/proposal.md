# Пропозиція розробника: реалізація зрізу «Чернетка заявки з опису»

## Why

Специфікація `openspec/specs/request-drafts/spec.md` (переклад вимоги PM `requirements/03-request-draft-assistant.md`,
AC-DRAFT-01 … AC-DRAFT-07, 10 golden cases) готова. Ця зміна — технічний план: як додати до форми нової заявки
помічника на безкоштовних моделях OpenRouter так, щоб кожен AC мав код, тест і рядок у `docs/conformance.md`, а
якість моделі вимірювалась golden cases PM, а не «на око».

## What Changes

- Чиста функція `extractDraft` (zod-схема, промпт з роздільниками, перевірка відповіді наявною валідацією форми):
  AC-DRAFT-01, AC-DRAFT-03, AC-DRAFT-04, AC-DRAFT-05, AC-DRAFT-07.
- Серверна обгортка моделі (ключ лише на сервері, fallback безкоштовних моделей, ліміти й тайм-аут) і стан
  «недоступний»: AC-DRAFT-06.
- Форма `/requests/new`: поле опису + «Скласти чернетку» заповнює наявну форму; заявку створює лише «Подати заявку»:
  AC-DRAFT-02.
- Офлайн-реплей golden cases у `npm test` і живий `npm run eval` поза CI; ADR 0004.

## Capabilities

### New Capabilities

— (поведінку описує `request-drafts`; ця зміна її не змінює, тому `skip_specs: true`)

### Modified Capabilities

—
