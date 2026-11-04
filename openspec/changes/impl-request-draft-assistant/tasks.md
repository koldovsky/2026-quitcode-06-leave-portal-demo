# Tasks

Вертикальні задачі: модуль + UI/Server Action + тест. Кожна закінчується рядком «Done when» з AC ID; перевірка —
`npm test`, `npm run ac:coverage`, `npm run check:design`, `npm run check:boundary`, `npm run build` (без ключа).

## 1. Ядро чернетки

- [x] 1.1 Залежності з точними версіями (`ai@7.0.162`, `@openrouter/ai-sdk-provider@3.1.0`, `zod@4.6.7`); ADR
  `docs/decisions/0004-ai-sdk-openrouter-free-models.md`.
  Done when: ADR прийнято; `npm ci` і `npm run build` зелені без ключа.
- [x] 1.2 `schema.ts`, `prompt.ts`, `extract.ts` (`extractDraft`, `toOutcome` на наявних `validateDates` /
  `normalizeSubstitute`); golden cases PM — `tests/fixtures/golden/cases.json`, заглушки відповідей —
  `recorded.json` + README; офлайн-реплей і юніт-тести.
  Done when: AC-DRAFT-01, AC-DRAFT-03, AC-DRAFT-04, AC-DRAFT-05, AC-DRAFT-07 — тести зелені.

## 2. Модель і збої

- [x] 2.1 `models.ts` (ланцюжок `:free`), `openrouter.ts` (`server-only`, єдиний читач ключа), `draft.ts`
  (`kyivToday`, `proposeDraft`); `classifyError`; `maxRetries: 0`, тайм-аут 25 с; правило в
  `scripts/check-server-boundary.mjs`; `.env.example`.
  Done when: AC-DRAFT-06 — тести (немає ключа, 429, тайм-аут, невалідний вихід) зелені; `npm run check:boundary` OK.

## 3. Форма

- [x] 3.1 `Textarea` у `@/components/ui`; `new-request-form.tsx` (форма чернетки + наявна форма заявки з
  `key={formRound}`); Server Action `proposeRequestDraft` (`requireRole("employee")`, без запису в базу, лог без
  тексту опису); `state.ts` з текстами PM.
  Done when: AC-DRAFT-02 — тест дії зелений; `npm run check:design` OK.

## 4. Якість і документи

- [x] 4.1 `npm run eval` (`vitest.eval.config.mts`, `evals/golden.live.eval.ts`): skip без ключа, preflight
  квоти, послідовно з паузою, модель і вердикт для кожного case, pass rate, звіт `docs/qa/eval/<дата>.md`,
  `RECORD=1`, `EVAL_REPLAY=1`.
  Done when: без ключа — 11 skipped, exit 0; `EVAL_REPLAY=1` — таблиця й pass rate.
- [x] 4.2 `docs/conformance.md` (AC-DRAFT-01…07 «реалізовано»), `product/roadmap.md`, `docs/demo/RUNBOOK-ws10.md`.
  Done when: `npm run ac:coverage` OK.
- [ ] 4.3 Живий прогін з власним ключем і `RECORD=1` — справжні записи замість заглушок; звіт у `docs/qa/eval/`.
  Done when: pass rate ≥ 8/10 (поріг PM) або issue з case'ами, що не пройшли.
- [ ] 4.4 Archive `impl-request-draft-assistant` у PR зрізу перед merge.
