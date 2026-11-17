# Докази для слайдів WS11: інцидент «хибна `NEXT_PUBLIC_SUPABASE_URL` на staging»

На занятті WS11 (Вт 17.11.2026) інцидент **розібрано на слайдах**, без поломки staging і без живих кроків у Vercel,
Telegram і MCP. Тут — лише те, що справді запущено: **локально, 17.11.2026 близько 08:21–08:23 за Києвом, Windows 11
(Git Bash), Node 24.18.0, Next.js 16.4.3**. Це не staging і не Vercel: `sha` і `env` у відповідях — `local`, а
`APP_ENV=staging` задано вручну в команді. Сценарій кроків — [`../RUNBOOK-ws11.md`](../RUNBOOK-ws11.md).

## Файли

| Файл | Крок RUNBOOK | Що показує |
|---|---|---|
| [`step3-build-ws11-operations.txt`](step3-build-ws11-operations.txt) | 3 | збірка з адресою дашборда замість Project URL проходить: хибну змінну не бачать ні збірка, ні TypeScript |
| [`step3-health-ws11-operations.txt`](step3-health-ws11-operations.txt) | 3 | `/api/health` до дії з postmortem: 503, `"db":"down","reason":"status-200"` — «база недоступна», без назви змінної |
| [`step3-smoke-ws11-operations.txt`](step3-smoke-ws11-operations.txt) | 3 | червоний smoke (`SMOKE_TARGET=deploy`, `bypass:true`): рядок JSON і `::error::` з підказкою «NEXT_PUBLIC_SUPABASE_URL у Vercel не той?», код виходу 1 |
| [`step7-vitest-env-check.txt`](step7-vitest-env-check.txt) | 7 | тести дії з postmortem (PR #41): `Tests  8 passed (8)` |
| [`step7-vitest-before-change.txt`](step7-vitest-before-change.txt) | 7 | ті самі тести на коді до зміни: `3 failed | 5 passed (8)` — тест справді ловить проблему |
| [`step7-health-env-check.txt`](step7-health-env-check.txt) | 7 | після дії з postmortem: `/api/health` → `"reason":"env-invalid:NEXT_PUBLIC_SUPABASE_URL"`, smoke називає змінну; значення змінної у відповіді немає |
| [`step7-diff-stat.txt`](step7-diff-stat.txt) | 7 | PR #41: 4 файли, +200/−11 |

## Як відтворено

Файли `.env*` не читали і не використовували для цих запусків (`.env.local` у робочій теці не було): усі значення
передано в командному рядку.

```bash
# одна «зламана» збірка на кожну гілку: NEXT_PUBLIC_* вбудовуються під час збірки
export NEXT_PUBLIC_SUPABASE_URL='https://supabase.com/dashboard/project/<ref>'
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test-only-not-a-real-key'
npx next build
APP_ENV=staging npx next start -p 3107
# в іншому терміналі
curl -s -i http://localhost:3107/api/health
SMOKE_TARGET=deploy VERCEL_AUTOMATION_BYPASS_SECRET=made-up-not-a-secret node scripts/smoke.mjs http://localhost:3107
```

- Гілки: крок 3 — `ws11/operations` (PR #40), крок 7 — `ws11/health-env-check` (PR #41); між гілками сервер
  зупинено, застосунок зібрано заново. Після запису в PR #41 уточнено лише коментарі в `src/lib/env-check.ts` і
  `tests/env-check.test.ts` (поведінка та сама); тести після цього перезапущено — `Tests  8 passed (8)`.
- **Усі значення вигадані:** `<ref>` — буквально цей текст, а не ref справжнього проєкту; публічний ключ і секрет
  обходу — не справжні. На localhost захисту Vercel немає: секрет лише вмикає `"bypass":true` у журналі smoke.
- Адреса дашборда — справжня адреса сайту Supabase, тож `/api/health` на коді до зміни робить запит до
  `supabase.com` і отримує сторінку для людей, а не API: звідси `status-200`. На Vercel `reason` може бути іншим
  `status-…` — на staging це не перевірялось.
- Перший `npx next build` на кожній гілці зібрав застосунок, але завершився кодом 1 з нагадуванням Next.js про
  вразливість версії 16.4.3; повторний запуск — код 0. Оновлення Next — окреме рішення, не в цьому PR.

## Чого тут немає і чому

На занятті ці кроки показано як **очікуваний вигляд з документації, не запис**: Redeploy і змінна для гілки у Vercel
(крок 2), прогін smoke у GitHub Actions і повідомлення в Telegram (крок 3), сесія агента через Vercel MCP (крок 4),
зелений smoke після виправлення (крок 5), чернетка postmortem (крок 6). Їх ніхто не запускав: гілки `staging`,
секретів Telegram і обходу захисту в демо станом на 17.11.2026 немає. Знімків, посилань на прогони, часу подій і
стенограм для них немає — і вигадувати їх не можна. Як провести дріл по-справжньому — RUNBOOK-ws11, розділ 5.
