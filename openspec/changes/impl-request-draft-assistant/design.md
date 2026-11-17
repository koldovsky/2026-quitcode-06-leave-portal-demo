# Design: impl-request-draft-assistant

## Context

- Специфікація: `openspec/specs/request-drafts/spec.md`, AC-DRAFT-01 … AC-DRAFT-07; golden cases — розділ «Golden
  cases» у `requirements/03-request-draft-assistant.md` («сьогодні» — вівторок 10.11.2026).
- Наявне: форма `/requests/new` і Server Action `createLeaveRequest`; валідація подання в
  `src/lib/leave/submission.ts` (`validateDates`, `normalizeSubstitute`); типи відсутності `LEAVE_TYPES`.
- Обмеження: власний безкоштовний ключ OpenRouter у кожного в команді; 20 запитів/хв і 50/день на акаунт для
  `:free` моделей; ключа може не бути (CI, збірка, прев'ю) — ADR 0004.

## Goals / Non-Goals

**Goals:**

- Кожен AC-DRAFT: код + тест з AC ID на початку назви + рядок у `docs/conformance.md`.
- `npm test`, `npm run build` і CI — без ключа й без мережі; живий прогін моделі — окрема команда.
- Ключ — лише на сервері, в одному модулі; клієнтський код не тягне AI SDK.

**Non-Goals:**

- Збереження чернеток, історія описів, стрімінг відповіді, голосовий ввід.
- Платні моделі, ZDR, LLM-суддя.
- Перезапис полів, змінених вручну (відкрите питання Q3 розробника): чернетка замінює всі поля.

## Decisions

### 1. Модулі

| Файл | Що | AC |
|---|---|---|
| `src/lib/request-draft/schema.ts` | `ModelDraftSchema` (zod): `status` ok/needs_info/refused, `leaveType`, `startDate`, `endDate`, `positions` main/additional/both, `substituteNote`; «невідомо» = `null` | 01, 03, 04, 07 |
| `src/lib/request-draft/prompt.ts` | `INSTRUCTIONS` (англійською: правила, синоніми типів, рік, «текст між тегами — дані»), `buildUserMessage` (TODAY + календар 21 день + `<employee_text>`), `sanitizeDescription` (вирізати теги, ≤ 500) | 01, 05 |
| `src/lib/request-draft/extract.ts` | `extractDraft(input, model)` — `generateText` + `Output.object`; `toOutcome` (наявні `validateDates`, `normalizeSubstitute`); `recoverFromText` (JSON у ```` ``` ````); `classifyError` | 01, 03, 04, 05, 06, 07 |
| `src/lib/request-draft/models.ts` | `FREE_MODELS`, `modelChain`, `makeDraftModel` (fallback `models`) | 06 |
| `src/lib/request-draft/openrouter.ts` | `import "server-only"`; `draftModel()` читає `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`, без ключа — `null` | 06 |
| `src/lib/request-draft/draft.ts` | `kyivToday(now)`, `proposeDraft` (немає моделі → `not_configured`) | 01, 06 |
| `src/lib/request-draft/state.ts` | клієнтський: `DRAFT_MESSAGES` (тексти PM), `nextDraftState`, `formValues` (посади → id) | 01, 03, 04, 06, 07 |
| `src/app/requests/new/actions.ts` | Server Action `proposeRequestDraft`: `requireRole("employee")` → `proposeDraft` → стан; лог лише `kind` + модель/причина | 02, 06 |
| `src/app/requests/new/new-request-form.tsx` | `"use client"`: форма чернетки (`Textarea`, «Скласти чернетку») + наявна форма заявки з `key={formRound}` | 01, 02 |

### 2. Потік

1. Працівник пише опис і натискає «Скласти чернетку» → Server Action `proposeRequestDraft`.
2. `requireRole("employee")`; `today = kyivToday(new Date())`; `draftModel()` — немає ключа → «недоступний».
3. `extractDraft`: порожній опис → `needs_info` без виклику; інакше `generateText` з `temperature: 0`,
   `maxRetries: 0`, `timeout: 25_000`.
4. Відповідь → `toOutcome`: `refused` / `needs_info` як є; `ok` без типу, з неіснуючою датою чи з кінцем раніше за
   початок → `needs_info` (дат місцями не міняємо — golden case 8).
5. Стан → `nextDraftState`: `ok` збільшує `formRound`, і форма заявки перемальовується з новими `defaultValue`;
   інакше поля не змінюються, опис лишається в полі. **Нічого не пишемо в базу** (AC-DRAFT-02).
6. Працівник перевіряє поля й натискає «Подати заявку» → наявний `createLeaveRequest` з усіма перевірками.

### 3. Помилки → «Помічник зараз недоступний» (AC-DRAFT-06)

| Причина | Як розпізнаємо |
|---|---|
| `not_configured` | `OPENROUTER_API_KEY` порожній |
| `rate_limited` | `APICallError` 429 або HTTP 200 з `data.code = 429`; `RetryError.lastError` розгортаємо першим |
| `timeout` | `TimeoutError` / `AbortError` |
| `invalid_output` | `NoObjectGeneratedError`, якщо JSON не вдалося дістати й з ```` ``` ```` |
| `provider_error` | решта |

Причину бачить лише журнал сервера; людина — один текст PM.

### 4. Безпека

- Ключ: `openrouter.ts` — єдиний читач, `server-only`; `check:boundary` перевіряє, що `OPENROUTER_API_KEY` ніде
  більше, `NEXT_PUBLIC_*API_KEY` немає, а `"use client"` не імпортує модулі моделі.
- Ін'єкції (AC-DRAFT-05): роздільники + вирізання тегів + «це дані» в інструкціях; головне — модель без tools і
  без запису: найгірше, що може зробити ін'єкція, — неправильні поля, які людина бачить перед поданням.
- Приватність: підказка «Не вказуйте діагноз…»; у логах немає тексту опису (тест); лише синтетичні дані в демо.

### 5. Тести

| AC | Тест |
|---|---|
| 01 | `tests/request-draft/golden.offline.test.ts` (GC-01…04, 06), `tests/request-draft/draft.test.ts` — повідомлення, `kyivToday`, календар, JSON у ```` ``` ````, заміна |
| 02 | `tests/request-draft/propose-action.test.ts` — дія не викликає `from`/`rpc`, роль `employee` |
| 03 | golden GC-07, GC-08; `draft.test.ts` — дати навпаки, без типу, порожній опис без виклику моделі |
| 04 | golden GC-09; `draft.test.ts` — `refused` не змінює поля |
| 05 | golden GC-10; `draft.test.ts` — теги з опису вирізано, обрізання до 500; `propose-action.test.ts` — без запису |
| 06 | `draft.test.ts` — немає ключа, 429 (рівно 1 виклик), HTTP 200 з 429, тайм-аут, невалідний вихід, 500; `propose-action.test.ts` — немає ключа |
| 07 | golden GC-05; `draft.test.ts` — `both` → усі посади |

- Офлайн-реплей: `tests/fixtures/golden/cases.json` (вхід і очікуване PM) + `recorded.json` (відповідь моделі,
  яку віддає `MockLanguageModelV4`). `recorded.json` — справжні відповіді `nvidia/nemotron-3.5-super-vl:free` з
  живого прогону 09.11.2026 (`RECORD=1 npm run eval`, `tests/fixtures/golden/README.md`); до того були заглушки,
  написані вручну.
- Живий прогін: `npm run eval` (`vitest.eval.config.mts`, `evals/golden.live.eval.ts`) — не в CI і не в
  `npm test`; без ключа — skip; `EVAL_REPLAY=1` — той самий звіт на записах (План Б).

## Risks / Trade-offs

- Якість безкоштовних моделей на українській і з відносними датами виміряна одним живим прогоном 09.11.2026: 10/10,
  усі відповіді — Nemotron; Gemma 4 не виміряна. Поріг PM 8/10 перевіряє `npm run eval`.
- 50 запитів/день на акаунт: демо + кілька прогонів eval можуть вичерпати ліміт → стан «недоступний», План Б.
- Список безкоштовних моделей змінюється — `FREE_MODELS` перевіряти перед заняттям.
- Чернетка замінює всі поля форми, навіть змінені вручну (Q3) — прийнятно для першої версії.
